/**
 * dsh-site-rebuild — the agent-facing tools.
 *
 * Six tools, one workflow:
 *   craft_study → craft_brief → (the agent writes app/) → craft_check → repeat.
 *
 * Every tool validates its own arguments, never throws into the model, returns
 * bounded content, and reports failures as `{ok:false, code, error, repair}` so
 * the agent can recover without guessing.
 */

import { LIMITS } from './config.js'
import { messageOf, truncateUtf8 } from './util.js'

/** Tool result presenter. */
const OUTPUT = {
  schema: { type: 'object', additionalProperties: true },
  render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }],
}

/** Structured repair hint. */
function repair(action, label, detail) {
  return { action, label, detail }
}

/** A structured failure value. */
function failure(code, error, hint) {
  return { ok: false, code, error, repair: hint }
}

/** Poll the job runner until a job settles. */
function awaitJob(service, jobId, timeoutMs = LIMITS.jobTimeoutMs) {
  return new Promise((resolve, reject) => {
    const started = Date.now()
    const timer = setInterval(() => {
      const job = service.jobs.get(jobId)
      if (!job) {
        clearInterval(timer)
        reject(new Error(`job ${jobId} vanished`))
        return
      }
      if (job.status === 'done') {
        clearInterval(timer)
        resolve(job)
        return
      }
      if (job.status === 'failed' || job.status === 'cancelled') {
        clearInterval(timer)
        reject(Object.assign(new Error(job.error ?? `job ${jobId} ${job.status}`), { code: job.status === 'cancelled' ? 'cancelled' : 'failed' }))
        return
      }
      if (Date.now() - started > timeoutMs) {
        clearInterval(timer)
        reject(new Error(`job ${jobId} did not finish within ${Math.round(timeoutMs / 1000)} s`))
      }
    }, 250)
    if (typeof timer.unref === 'function') timer.unref()
  })
}

/** Read a positive integer argument with a default and a cap. */
function readInt(value, fallback, min, max) {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, Math.round(n)))
}

const STUDY_DESCRIPTION = [
  'Study a website with a real headless browser and record evidence, as the first step of rebuilding it.',
  'Captures the page at three viewports (overridable), extracts computed colours/fonts/spacing/type scale/CSS breakpoints,',
  'section padding and items-per-row, headings and visible text, links, forms, assets, landmarks and console/network health;',
  'photographs each viewport and builds a noise mask so self-changing regions are excluded from later comparison.',
  'Use this when the user asks to copy, recreate, clone, rebuild or "做一版" a site, or to understand how a site is built.',
  'Clean room is the default: only visitor-visible content is read, never the site source. mode="deep" also saves rendered HTML.',
  'Returns a projectId used by craft_brief and craft_check.',
].join(' ')

const BRIEF_DESCRIPTION = [
  'Return the build brief for a studied project: exact measured design values, responsive rules, page structure, section measurements,',
  'clean-room/originality rules and acceptance criteria. Read it before writing the rebuild, and write the app into the project',
  'app/ folder. Bounded to 48 KiB; it is also saved as capture/BRIEF.md.',
].join(' ')

const CHECK_DESCRIPTION = [
  'Check the rebuild against the original: serves the build (or a URL), captures it at the same viewports, and compares screenshots',
  'with the original (layout tiles + SSIM detail + design-token likeness), page height, visible text, structure, design values and',
  'runtime health. Returns a 0–100 score, per-viewport breakdown, mismatch regions and a fix list; writes screenshots, diff images',
  'and checks/round-N/check.json. Run it after every build round; target ≥ 90.',
].join(' ')

const PROJECTS_DESCRIPTION = [
  'List, inspect or delete website rebuild projects. action="list" returns summaries (id, name, target, status, scores);',
  'action="get" returns one project\'s state and latest check; action="delete" removes one project and its files.',
].join(' ')

const EVIDENCE_DESCRIPTION = [
  'Browse a project\'s evidence records with their confidence, coverage, limitations and locations. Paged; filter by kind',
  '(target, design-tokens, layout, content, assets, responsive, health, a11y, dynamic, page, source).',
].join(' ')

const SERVE_DESCRIPTION = [
  'Start (or reuse) a loopback preview server for a project\'s built app folder and return its URL, for opening in a browser or',
  'for craft_check. Read-only: serves files from the project directory, no writes.',
].join(' ')

/**
 * Build the tool definitions.
 * @param {{service: object, config: object, log?: object}} options
 */
export function createTools({ service, config, log } = {}) {
  const tools = []
  const warn = (message) => {
    try {
      log?.warn?.(message)
    } catch {
      /* logging never breaks a tool */
    }
  }

  /** Wrap a handler so unexpected errors become structured failures. */
  const guarded = (name, handler) => async (args) => {
    try {
      return await handler(args && typeof args === 'object' && !Array.isArray(args) ? args : {})
    } catch (error) {
      warn(`tool ${name} failed: ${messageOf(error)}`)
      return failure(error?.code ?? 'failed', messageOf(error), error?.repair ?? repair('retry', 'Retry', 'Inspect the project state or the panel diagnostics if it keeps failing.'))
    }
  }

  tools.push({
    name: 'craft_study',
    description: STUDY_DESCRIPTION,
    parameters: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'http(s) URL of the target page (required unless projectId is given).' },
        request: { type: 'string', description: 'What the user wants built, e.g. "复刻这个首页，用 React". Stored with the project and used in the brief.' },
        mode: { type: 'string', enum: ['clean', 'deep'], description: 'clean (default): visitor-visible content only; deep: also save rendered HTML.' },
        width: { type: 'array', items: { type: 'integer' }, description: 'Optional viewport widths; defaults to [1440, 768, 375].' },
        maxPages: { type: 'integer', description: `Extra same-origin pages to capture besides the start page (0-12; default from plugin config: ${Math.max(0, config.maxPages - 1)}).` },
        projectId: { type: 'string', description: 'Re-study an existing project instead of creating one.' },
        name: { type: 'string', description: 'Optional project name.' },
        stack: { type: 'string', description: 'Optional stack hint for the brief (e.g. "React + Vite").' },
      },
      additionalProperties: false,
    },
    output: OUTPUT,
    timeoutMs: LIMITS.jobTimeoutMs + 15000,
    isConcurrencySafe: () => false,
    execute: guarded('craft_study', async (args) => {
      let projectId = typeof args.projectId === 'string' ? args.projectId.trim() : ''
      if (!projectId) {
        if (typeof args.url !== 'string' || args.url.trim().length === 0) {
          return failure('invalid_input', 'url is required when projectId is not given', repair('provide-url', 'Provide the target URL', 'Example: {"url":"https://example.com","request":"复刻这个首页"}'))
        }
        const project = await service.createProject({
          url: args.url.trim(),
          request: typeof args.request === 'string' ? args.request : '',
          mode: args.mode === 'deep' ? 'deep' : 'clean',
          stack: typeof args.stack === 'string' ? args.stack : '',
          name: typeof args.name === 'string' ? args.name : '',
        })
        projectId = project.id
      }
      const job = service.startStudy(projectId, {
        widths: Array.isArray(args.width) ? args.width : undefined,
        maxPages: args.maxPages,
      })
      const settled = await awaitJob(service, job.id)
      const result = settled.result ?? {}
      const detail = await service.projectDetail(projectId)
      const summary = result.summary ?? null
      return {
        ok: true,
        projectId,
        target: detail.project.target.url,
        mode: detail.project.mode,
        status: detail.project.status,
        pages: summary?.pages?.map((page) => ({ path: page.path || '/', title: page.title, widths: page.widthData.map((row) => ({ width: row.width, pageW: row.pageW, pageH: row.pageH, h1: row.type?.h1 ?? 0, body: row.type?.body ?? 0 })) })) ?? [],
        breakpoints: summary?.breakpoints ?? [],
        design: summary?.tokenCounts ?? null,
        evidenceCount: result.evidenceCount ?? detail.evidence.total,
        durationMs: result.durationMs ?? 0,
        limitations: result.limitations ?? [],
        next: `Read the brief with craft_brief({projectId:"${projectId}"}), write the rebuild into the project app/ folder, then run craft_check({projectId:"${projectId}"}).`,
        hint: 'Screenshots and the full capture are under the project capture/ folder; the panel shows them too.',
      }
    }),
  })

  tools.push({
    name: 'craft_brief',
    description: BRIEF_DESCRIPTION,
    parameters: {
      type: 'object',
      properties: { projectId: { type: 'string', description: 'Project id returned by craft_study.' } },
      required: ['projectId'],
      additionalProperties: false,
    },
    output: OUTPUT,
    timeoutMs: 30000,
    isConcurrencySafe: () => true,
    execute: guarded('craft_brief', async (args) => {
      const projectId = typeof args.projectId === 'string' ? args.projectId.trim() : ''
      if (!projectId) return failure('invalid_input', 'projectId is required', repair('list-projects', 'List projects', 'Call craft_projects with action="list".'))
      const brief = await service.brief(projectId)
      const bounded = truncateUtf8(brief.markdown, LIMITS.toolContentBytes)
      return {
        ok: true,
        projectId,
        bytes: brief.bytes,
        truncated: bounded.truncated,
        markdown: bounded.text,
        file: `projects/${projectId}/capture/BRIEF.md`,
        hint: 'Write the rebuilt site into the project app/ folder (index.html directly, or dist/ build/ out/). Then run craft_check.',
      }
    }),
  })

  tools.push({
    name: 'craft_check',
    description: CHECK_DESCRIPTION,
    parameters: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project id returned by craft_study.' },
        url: { type: 'string', description: 'Optional URL of the running build; when omitted the project app/ folder is served.' },
        appDir: { type: 'string', description: 'Optional absolute folder to serve when url is omitted.' },
      },
      required: ['projectId'],
      additionalProperties: false,
    },
    output: OUTPUT,
    timeoutMs: LIMITS.jobTimeoutMs + 15000,
    isConcurrencySafe: () => false,
    execute: guarded('craft_check', async (args) => {
      const projectId = typeof args.projectId === 'string' ? args.projectId.trim() : ''
      if (!projectId) return failure('invalid_input', 'projectId is required', repair('list-projects', 'List projects', 'Call craft_projects with action="list".'))
      const job = service.startCheck(projectId, { url: typeof args.url === 'string' ? args.url : '', appDir: typeof args.appDir === 'string' ? args.appDir : '' })
      const settled = await awaitJob(service, job.id)
      const result = settled.result ?? {}
      const topRegions = []
      for (const page of result.perPage ?? []) {
        for (const row of page.perWidth ?? []) {
          for (const region of row.regions ?? []) topRegions.push({ page: page.page, width: row.width, ...region })
        }
      }
      topRegions.sort((a, b) => b.delta - a.delta)
      return {
        ok: true,
        projectId,
        round: result.round,
        score: result.score,
        grade: result.grade,
        durationMs: result.durationMs,
        pages: (result.perPage ?? []).map((page) => ({
          page: page.page,
          score: page.score,
          widths: (page.perWidth ?? []).map((row) => ({
            width: row.width,
            score: row.score,
            layout: row.layout,
            detail: row.detail,
            token: row.token && typeof row.token === 'object' ? row.token.score ?? null : row.token ?? null,
            heights: row.heights,
            pixelRatio: row.pixelDiff?.ratio ?? null,
          })),
          text: page.text ? { similarity: page.text.similarity, missingHeadings: (page.text.missingHeadings ?? []).slice(0, 6), missingWords: (page.text.missingWords ?? []).slice(0, 8) } : null,
          structure: page.structure ? { similarity: page.structure.similarity, missing: page.structure.missing ?? [] } : null,
          design: (page.design ?? []).slice(0, 12),
          health: (page.health ?? []).slice(0, 6),
        })),
        notes: result.notes ?? [],
        failedClaims: (result.claims ?? []).filter((claim) => !claim.passed).slice(0, 12),
        unknowns: result.unknowns ?? [],
        topRegions: topRegions.slice(0, 11),
        diffs: result.artifacts ?? [],
        next: result.score >= 90
          ? 'The rebuild is close enough. Report the score and the remaining differences; ask the user if they want changes.'
          : 'Fix the largest visible differences first (layout/section order, spacing, sizes, colours, fonts, missing parts), rebuild, then run craft_check again.',
        hint: 'The panel shows each round with screenshots, diff images and the full fix list.',
      }
    }),
  })

  tools.push({
    name: 'craft_projects',
    description: PROJECTS_DESCRIPTION,
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['list', 'get', 'delete'], description: 'list (default) | get | delete' },
        projectId: { type: 'string', description: 'Project id for get/delete.' },
        limit: { type: 'integer', description: 'Maximum rows for list (1-100; default 20).' },
      },
      additionalProperties: false,
    },
    output: OUTPUT,
    timeoutMs: 30000,
    isConcurrencySafe: () => true,
    execute: guarded('craft_projects', async (args) => {
      const action = typeof args.action === 'string' && args.action.length > 0 ? args.action : 'list'
      if (action === 'list') {
        const limit = readInt(args.limit, 20, 1, 100)
        const projects = (await service.listProjects()).slice(0, limit)
        return {
          ok: true,
          action,
          total: projects.length,
          projects: projects.map((project) => ({
            id: project.id,
            name: project.name,
            url: project.url,
            mode: project.mode,
            status: project.status,
            score: project.lastScore,
            bestScore: project.bestScore,
            steps: project.steps,
            pages: project.pageCount,
            widths: project.widths,
            updatedAt: project.updatedAt,
          })),
          hint: projects.length === 0 ? 'No projects yet. Call craft_study with a URL to create one.' : 'Use action="get" for one project or craft_check to validate a build.',
        }
      }
      if (action === 'get') {
        const projectId = typeof args.projectId === 'string' ? args.projectId.trim() : ''
        if (!projectId) return failure('invalid_input', 'projectId is required for action="get"', repair('list-projects', 'List projects', 'Call craft_projects with action="list".'))
        const detail = await service.projectDetail(projectId)
        return {
          ok: true,
          action,
          project: {
            id: detail.project.id,
            name: detail.project.name,
            target: detail.project.target,
            request: detail.project.request,
            mode: detail.project.mode,
            status: detail.project.status,
            steps: detail.project.steps,
            capture: detail.capture
              ? { widths: detail.capture.widths, pages: detail.capture.pages.map((page) => ({ path: page.path, title: page.title, shots: page.screenshots.length })), studiedAt: detail.capture.studiedAt, limitations: detail.capture.limitations }
              : null,
            checks: (detail.checks ?? []).slice(-3).map((check) => ({ round: check.round, score: check.score, grade: check.grade, at: check.at, notes: check.notes })),
            bestScore: detail.project.bestScore,
            evidence: detail.evidence.summary,
            job: detail.job ? { status: detail.job.status, progress: detail.job.progress } : null,
          },
        }
      }
      if (action === 'delete') {
        const projectId = typeof args.projectId === 'string' ? args.projectId.trim() : ''
        if (!projectId) return failure('invalid_input', 'projectId is required for action="delete"', repair('list-projects', 'List projects', 'Call craft_projects with action="list".'))
        const result = await service.deleteProject(projectId)
        return { ok: true, action, projectId, removed: result.removed }
      }
      return failure('invalid_input', `unknown action ${JSON.stringify(action)}`, repair('choose-action', 'Use list, get or delete', 'Example: {"action":"list"}'))
    }),
  })

  tools.push({
    name: 'craft_evidence',
    description: EVIDENCE_DESCRIPTION,
    parameters: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project id.' },
        offset: { type: 'integer', description: 'Page offset (default 0).' },
        limit: { type: 'integer', description: 'Rows per page (1-20; default 8).' },
        kind: { type: 'string', description: 'Filter by evidence kind, e.g. "design-tokens".' },
      },
      required: ['projectId'],
      additionalProperties: false,
    },
    output: OUTPUT,
    timeoutMs: 30000,
    isConcurrencySafe: () => true,
    execute: guarded('craft_evidence', async (args) => {
      const projectId = typeof args.projectId === 'string' ? args.projectId.trim() : ''
      if (!projectId) return failure('invalid_input', 'projectId is required', repair('list-projects', 'List projects', 'Call craft_projects with action="list".'))
      const page = await service.evidence(projectId, {
        offset: readInt(args.offset, 0, 0, 1000),
        limit: readInt(args.limit, 8, 1, 20),
        kind: typeof args.kind === 'string' ? args.kind : '',
      })
      const records = page.records.map((record) => ({
        id: record.id,
        kind: record.kind,
        title: record.title,
        summary: record.summary,
        confidence: record.confidence,
        confidenceLabel: record.confidenceLabel,
        coverage: record.coverage,
        limitations: record.limitations,
        locations: record.locations,
        width: record.width,
      }))
      const bounded = truncateUtf8(JSON.stringify(records), LIMITS.toolContentBytes)
      return {
        ok: true,
        projectId,
        total: page.total,
        offset: page.offset,
        limit: page.limit,
        returned: page.returned,
        kinds: page.kinds,
        summary: page.summary,
        records: bounded.truncated ? { truncated: true, json: bounded.text } : records,
        hint: 'Records are summaries; the panel shows full evidence, confidence and limitations. Page with offset+limit.',
      }
    }),
  })

  tools.push({
    name: 'craft_serve',
    description: SERVE_DESCRIPTION,
    parameters: {
      type: 'object',
      properties: { projectId: { type: 'string', description: 'Project id.' } },
      required: ['projectId'],
      additionalProperties: false,
    },
    output: OUTPUT,
    timeoutMs: 30000,
    isConcurrencySafe: () => true,
    execute: guarded('craft_serve', async (args) => {
      const projectId = typeof args.projectId === 'string' ? args.projectId.trim() : ''
      if (!projectId) return failure('invalid_input', 'projectId is required', repair('list-projects', 'List projects', 'Call craft_projects with action="list".'))
      const preview = await service.preview(projectId)
      return { ok: true, projectId, url: preview.url, hint: 'Open this loopback URL in a browser; the check tool can also compare it directly.' }
    }),
  })

  return tools
}
