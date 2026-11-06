/**
 * dsh-site-rebuild — orchestration service.
 *
 * The single source of truth behind both the agent tools and the panel:
 *   study(projectId)  capture a target site and record evidence
 *   brief(projectId)  generate (and persist) the build brief
 *   check(projectId)  capture the build, compare it with the original, record a round
 *
 * Long operations run through the job runner so the panel can poll progress;
 * the tools await the same job result synchronously.
 */

import { spawn } from 'node:child_process'
import { readdir, readFile, stat } from 'node:fs/promises'
import http from 'node:http'
import { join } from 'node:path'
import { aggregateScore, buildClaims, combineScores, compareViewport, designNotes, diffImage, gradeForScore, healthNotes, structureLikeness, textLikeness, tokenSimilarity } from './diff.js'
import { buildBrief } from './brief.js'
import { captureSite, screenshotFileFor, noiseFileFor } from './capture.js'
import { LIMITS, ROUTE_PREFIX, WIDTH_WEIGHTS, normalizeWidths, weightForWidth } from './config.js'
import { CONFIDENCE, createEvidence, evidenceSummary, pageEvidence } from './evidence.js'
import { createJobs } from './jobs.js'
import { decodePng, encodePng } from './png.js'
import { detectSiteDir, startPreview } from './preview.js'
import { createStore } from './store.js'
import { captureReadme, summarizeCapture } from './tokens.js'
import { ensureDir, messageOf, nowIso, readJsonFile, rmDir, writeFileAtomic, writeJsonAtomic } from './util.js'

/** Build a structured service failure. */
function fail(code, error, repair) {
  const failure = new Error(error)
  failure.code = code
  failure.repair = repair
  return failure
}

/** The repair object tools echo back to the agent. */
function repair(action, label, detail) {
  return { action, label, detail }
}

/** Read one capture page document (`page.json`) from a directory. */
export async function readCapturePage(dir) {
  const data = await readJsonFile(join(dir, 'page.json'), null)
  if (!data || typeof data !== 'object' || !data.documents) return null
  return { url: String(data.url ?? ''), widths: Array.isArray(data.widths) ? data.widths : Object.keys(data.documents).map(Number), documents: data.documents }
}

/** Load a whole capture tree (start page + routes). */
export async function loadCapture(dir) {
  const start = await readCapturePage(dir)
  if (!start) return null
  const routesFile = await readJsonFile(join(dir, 'routes.json'), [])
  const routes = []
  for (const route of Array.isArray(routesFile) ? routesFile : []) {
    if (!route || typeof route.slug !== 'string') continue
    const page = await readCapturePage(join(dir, 'routes', route.slug))
    if (!page) continue
    routes.push({ ...route, dir: `routes/${route.slug}`, ...page })
  }
  return { start: { path: '', dir: '', ...start }, routes, widths: start.widths }
}

/** Sum of file sizes under a directory (bounded walk). */
async function directoryBytes(dir) {
  let total = 0
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return 0
  }
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue
    const path = join(dir, entry.name)
    if (entry.isDirectory()) total += await directoryBytes(path)
    else {
      const info = await stat(path).catch(() => null)
      if (info) total += info.size
    }
  }
  return total
}

/** Simple HTTP preflight so a 404 preview is reported clearly. */
function preflight(url) {
  return new Promise((resolve) => {
    let request
    try {
      request = http.get(url, { timeout: 6000 }, (response) => {
        const status = response.statusCode ?? 0
        const type = String(response.headers['content-type'] ?? '')
        response.resume()
        resolve({ ok: status >= 200 && status < 400, status, type })
      })
    } catch (error) {
      resolve({ ok: false, status: 0, type: '', error: messageOf(error) })
      return
    }
    request.on('timeout', () => {
      request.destroy()
      resolve({ ok: false, status: 0, type: '', error: 'timeout' })
    })
    request.on('error', (error) => resolve({ ok: false, status: 0, type: '', error: messageOf(error) }))
  })
}

/**
 * Create the service.
 * @param {{store: ReturnType<typeof createStore>, pool: import('./browser.js').BrowserPool, config: object, log: object}} options
 */
export function createService({ store, pool, config, log }) {
  const jobs = createJobs({ log })
  const previews = new Map()

  const warn = (message) => {
    try {
      log?.warn?.(message)
    } catch {
      /* logging never breaks a service call */
    }
  }

  /** Read a project or throw a structured not-found error. */
  async function mustGet(projectId) {
    if (typeof projectId !== 'string' || projectId.length === 0) {
      throw fail('invalid_input', 'projectId is required', repair('list-projects', 'List projects first', 'Call craft_projects with action="list" to see ids.'))
    }
    const project = await store.get(projectId)
    if (!project) {
      throw fail('not_found', `project ${JSON.stringify(projectId)} does not exist`, repair('list-projects', 'Use an existing project id', 'Call craft_projects with action="list".'))
    }
    return project
  }

  /** The folder a built site is served from. */
  async function siteDirFor(projectId, explicit) {
    const paths = store.paths(projectId)
    if (typeof explicit === 'string' && explicit.trim().length > 0) return explicit.trim()
    return detectSiteDir(paths.app)
  }

  /** Generate study evidence records from the capture documents. */
  function studyEvidence(project, captureSummary, pages) {
    const records = []
    const mode = project.mode
    const started = project.target.url
    records.push(
      createEvidence({
        kind: 'target',
        title: '目标与捕获范围',
        summary: `捕获 ${started} 的 ${captureSummary.pages.length} 个页面，视口 ${captureSummary.widths.join('/')} px；模式 ${mode === 'deep' ? '深潜' : '净室'}。页面标题「${captureSummary.start?.title ?? ''}」，页面高度 ${captureSummary.start?.pageH ?? 0} px。`,
        confidence: CONFIDENCE.measured,
        coverage: ['URL', 'title', 'language', 'viewport', 'page count'],
        limitations: ['the page was read as a visitor, not as the site operator'],
        locations: [{ url: started }],
        data: { url: started, pages: captureSummary.pages.map((page) => ({ path: page.path, title: page.title, pages: page.widthData.map((row) => ({ width: row.width, pageW: row.pageW, pageH: row.pageH })) })), widths: captureSummary.widths, breakpoints: captureSummary.breakpoints },
        tool: 'craft_study',
        mode,
      }),
    )
    const start = pages[0]
    for (const width of captureSummary.widths) {
      const document = start?.documents?.[String(width)]
      if (!document) continue
      const layout = document.layouts ?? {}
      records.push(
        createEvidence({
          kind: 'design-tokens',
          title: `设计令牌 @${width}px`,
          summary: `${document.design.backgrounds.length} 种背景色、${document.design.textColors.length} 种文字色、${document.design.fonts.length} 个字体族、${document.design.fontSizes.length} 种字号、${document.design.spacing.length} 个间距值；主字体 ${document.design.fonts[0]?.value ?? '未知'}。`,
          confidence: CONFIDENCE.measured,
          coverage: ['computed colors', 'font stacks', 'font sizes', 'weights', 'spacing', 'radii', 'shadows', 'CSS custom properties'],
          limitations: ['pseudo-element styles and closed shadow roots are not measured', 'hover/focus states are not enumerated'],
          locations: [{ path: `capture/${start?.dir ? start.dir + '/' : ''}screenshot-${width}.png`, detail: `${width}px 截图` }],
          width,
          data: {
            design: document.design,
            breakpoints: document.css?.breakpoints ?? [],
            customProperties: document.design.customProperties ?? {},
          },
          tool: 'craft_study',
          mode,
        }),
      )
      records.push(
        createEvidence({
          kind: 'layout',
          title: `布局测量 @${width}px`,
          summary: `页面 ${layout.pageW ?? 0}×${layout.pageH ?? 0} px；h1 ${layout.type?.h1 ?? 0}px、h2 ${layout.type?.h2 ?? 0}px、正文 ${layout.type?.body ?? 0}px；${layout.blocks?.length ?? 0} 个区块${document.pageW > width ? '；存在横向滚动' : ''}。`,
          confidence: CONFIDENCE.measured,
          coverage: ['page size', 'type scale', 'section blocks', 'padding', 'items per row', 'content column'],
          limitations: ['sections are measured from the rendered page, not from component source', 'sticky/fixed layers are measured at scroll position 0'],
          locations: [{ path: `capture/${start?.dir ? start.dir + '/' : ''}screenshot-${width}.png` }],
          width,
          data: { layout },
          tool: 'craft_study',
          mode,
        }),
      )
    }
    const startDoc = start?.documents?.[String(captureSummary.widths[0])]
    if (startDoc) {
      records.push(
        createEvidence({
          kind: 'content',
          title: '可见内容与交互',
          summary: `${startDoc.headings.length} 个标题、${startDoc.links.length} 个链接、${startDoc.forms.length} 个表单控件；可见文本 ${String(startDoc.text ?? '').length} 字符。`,
          confidence: CONFIDENCE.extracted,
          coverage: ['visible text', 'headings', 'links', 'form shapes'],
          limitations: ['text inside images, canvas and cross-origin iframes is not visible', 'dynamic content only as captured at the moment of study'],
          locations: [{ path: `capture/${start?.dir ? start.dir + '/' : ''}page.json` }],
          data: {
            headings: startDoc.headings,
            links: startDoc.links.slice(0, 300),
            forms: startDoc.forms,
            textSample: String(startDoc.text ?? '').slice(0, 2000),
            textLength: String(startDoc.text ?? '').length,
          },
          tool: 'craft_study',
          mode,
        }),
      )
      records.push(
        createEvidence({
          kind: 'assets',
          title: '资源清单',
          summary: `${startDoc.assets.images.length} 个图片 URL、${startDoc.assets.stylesheets.length} 个样式表、${startDoc.assets.scripts.length} 个脚本、${startDoc.assets.fonts.length} 个字体族；其中 ${startDoc.css?.inaccessibleStylesheets ?? 0} 个跨域样式表无法读取规则。`,
          confidence: CONFIDENCE.extracted,
          coverage: ['image URLs', 'stylesheets', 'scripts', 'media', 'font families', 'CSS rule count'],
          limitations: ['assets are listed for understanding, not for copying', 'cross-origin stylesheet rules are not readable'],
          locations: [{ path: `capture/${start?.dir ? start.dir + '/' : ''}page.json` }],
          data: {
            counts: { images: startDoc.assets.images.length, stylesheets: startDoc.assets.stylesheets.length, scripts: startDoc.assets.scripts.length, media: startDoc.assets.media.length },
            fonts: startDoc.assets.fonts,
            stylesheetCount: startDoc.css?.stylesheetCount ?? 0,
            ruleCount: startDoc.css?.ruleCount ?? 0,
            blockedHosts: config.blockedHosts,
          },
          tool: 'craft_study',
          mode,
        }),
      )
      records.push(
        createEvidence({
          kind: 'responsive',
          title: '响应式规则',
          summary: `CSS 断点：${(startDoc.css?.breakpoints ?? []).map((bp) => `${bp.width}px`).join('、') || '未发现'}；各宽度页面高度 ${(captureSummary.pages.find((page) => page.dir === '')?.widthData ?? []).map((row) => `${row.width}→${row.pageH}px`).join('、')}。`,
          confidence: CONFIDENCE.inferred,
          coverage: ['media-query widths', 'per-width page size', 'per-width type scale'],
          limitations: ['container queries, JS-driven breakpoints and clamped() values are not resolved to breakpoints'],
          locations: [{ path: `capture/${start?.dir ? start.dir + '/' : ''}page.json` }],
          data: { breakpoints: startDoc.css?.breakpoints ?? [], widths: captureSummary.widths, type: (captureSummary.pages.find((page) => page.dir === '')?.widthData ?? []).map((row) => ({ width: row.width, type: row.type })) },
          tool: 'craft_study',
          mode,
        }),
      )
      records.push(
        createEvidence({
          kind: 'health',
          title: '运行时健康状况',
          summary: `控制台错误 ${startDoc.health?.consoleErrors?.length ?? 0} 条、失败请求 ${startDoc.health?.failedRequests?.length ?? 0} 个、请求 ${startDoc.health?.requests?.length ?? 0} 个；传输 ${startDoc.timing?.transferBytes ?? 0} 字节。`,
          confidence: CONFIDENCE.measured,
          coverage: ['console errors', 'failed requests', 'request inventory', 'navigation timing'],
          limitations: ['only events while the page was open are recorded', 'analytics hosts are blocked during capture'],
          locations: [{ path: 'capture/page.json' }],
          data: { consoleErrors: startDoc.health?.consoleErrors ?? [], failedRequests: startDoc.health?.failedRequests ?? [], requests: (startDoc.health?.requests ?? []).slice(0, 80), timing: startDoc.timing },
          tool: 'craft_study',
          mode,
        }),
      )
      records.push(
        createEvidence({
          kind: 'a11y',
          title: '无障碍与地标',
          summary: `landmarks：${Object.keys(startDoc.a11y?.landmarks ?? {}).join('、') || '无'}；无 alt 图片 ${startDoc.a11y?.imagesWithoutAlt ?? 0} 张；无名称控件 ${startDoc.a11y?.unnamedControls ?? 0} 个。`,
          confidence: CONFIDENCE.heuristic,
          coverage: ['landmarks', 'heading outline', 'alt coverage', 'control names'],
          limitations: ['a full accessibility audit is out of scope; this is a shape check'],
          locations: [{ path: 'capture/page.json' }],
          data: { a11y: startDoc.a11y },
          tool: 'craft_study',
          mode,
        }),
      )
      const dynamic = (captureSummary.widths ?? [])
        .map((width) => {
          const doc = start?.documents?.[String(width)]
          return doc?.noise ? { width, ...doc.noise } : null
        })
        .filter(Boolean)
      records.push(
        createEvidence({
          kind: 'dynamic',
          title: '自变化区域（噪声掩膜）',
          summary: dynamic.length > 0 ? dynamic.map((row) => `${row.width}px：掩膜 ${Math.round(row.maskedRatio * 1000) / 10}%`).join('；') : '未生成噪声掩膜（页面在两次拍摄间完全静止）。',
          confidence: CONFIDENCE.heuristic,
          coverage: ['self-changing pixel regions', 'media rectangles'],
          limitations: ['slow animations longer than the second capture delay can escape the mask'],
          locations: dynamic.map((row) => ({ path: `capture/noise-${row.width}.png` })),
          data: { dynamic },
          tool: 'craft_study',
          mode,
        }),
      )
    }
    for (const page of pages.slice(1)) {
      const document = page.documents?.[String(captureSummary.widths[0])]
      if (!document) continue
      records.push(
        createEvidence({
          kind: 'page',
          title: `子页面 ${page.path}`,
          summary: `「${document.title || page.path}」：${document.layouts?.pageW ?? 0}×${document.layouts?.pageH ?? 0}px，${document.headings.length} 个标题；截图在 capture/${page.dir}/。`,
          confidence: CONFIDENCE.measured,
          coverage: ['page title', 'layout', 'headings', 'navigation path'],
          limitations: ['only same-origin links reachable from the start page were captured'],
          locations: [{ path: `capture/${page.dir}/screenshot-${captureSummary.widths[0]}.png` }],
          data: { path: page.path, title: document.title, type: document.layouts?.type, blocks: document.layouts?.blocks?.length ?? 0, headings: document.headings.slice(0, 30) },
          tool: 'craft_study',
          mode,
        }),
      )
    }
    if (mode === 'deep') {
      const htmlBytes = (project.capture?.deepBytes ?? 0)
      records.push(
        createEvidence({
          kind: 'source',
          title: '深潜模式源码',
          summary: `深潜模式已保存渲染后的 HTML（约 ${htmlBytes} 字符）供理解结构；重建时不得直接粘贴原始代码。`,
          confidence: CONFIDENCE.measured,
          coverage: ['rendered HTML'],
          limitations: ['only deep mode reads source; clean room never does'],
          locations: [{ path: 'capture/page.json', detail: 'documents.<width>.html' }],
          data: { bytes: htmlBytes },
          tool: 'craft_study',
          mode: 'deep',
        }),
      )
    }
    return records.slice(0, LIMITS.maxEvidence)
  }

  return {
    store,
    pool,
    jobs,
    config,

    /** Overview for the panel. */
    overview() {
      return {
        version: '0.2.0',
        dataDir: store.dataDir,
        config: {
          widths: config.widths,
          maxPages: config.maxPages,
          openStates: config.openStates,
          browserPath: config.browserPath,
          includeDiffImages: config.includeDiffImages,
        },
        browser: pool.availability(),
        limits: { maxPageHeight: LIMITS.maxPageHeight, maxProjects: LIMITS.maxProjects, toolContentBytes: LIMITS.toolContentBytes },
      }
    },

    /** List project summaries. */
    async listProjects() {
      return store.list()
    },

    /** One project's detail for the panel and tools. */
    async projectDetail(projectId) {
      const project = await mustGet(projectId)
      const paths = store.paths(projectId)
      const evidenceRecords = (await readJsonFile(join(paths.capture, 'evidence.json'), [])) ?? []
      const start = await readCapturePage(paths.capture)
      const startWidth = start?.widths?.[0] ?? 0
      const startDoc = start?.documents?.[String(startWidth)] ?? null
      return {
        project,
        capture: start
          ? {
              widths: start.widths,
              pages: (project.capture?.pages ?? []).map((page) => ({
                ...page,
                screenshots: (project.capture?.widths ?? []).map((width) => ({
                  width,
                  // Routes on the panel resolve these against the project root,
                  // while the study writes them under capture/ (optionally in a
                  // routes/<slug>/ subfolder). Keep the full relative path here.
                  path: `capture/${page.dir ? page.dir + '/' : ''}screenshot-${width}.png`,
                  noise: `capture/${page.dir ? page.dir + '/' : ''}noise-${width}.png`,
                })),
              })),
              start: project.capture?.start ?? null,
              limitations: project.capture?.limitations ?? [],
              studiedAt: project.capture?.studiedAt ?? null,
            }
          : null,
        tokens: startDoc
          ? {
              width: startWidth,
              title: startDoc.title,
              lang: startDoc.lang,
              design: startDoc.design,
              layouts: startDoc.layouts,
              breakpoints: startDoc.css?.breakpoints ?? [],
              outline: (startDoc.outline ?? []).slice(0, 80),
              headings: (startDoc.headings ?? []).slice(0, 40),
              a11y: startDoc.a11y,
              health: {
                consoleErrors: (startDoc.health?.consoleErrors ?? []).length,
                failedRequests: (startDoc.health?.failedRequests ?? []).length,
                requests: (startDoc.health?.requests ?? []).length,
              },
              assets: {
                images: (startDoc.assets?.images ?? []).length,
                stylesheets: startDoc.css?.stylesheetCount ?? 0,
                scripts: (startDoc.assets?.scripts ?? []).length,
                fonts: (startDoc.assets?.fonts ?? []).length,
              },
              timing: startDoc.timing ?? {},
            }
          : null,
        evidence: { summary: evidenceSummary(evidenceRecords), total: evidenceRecords.length },
        job: jobs.latestFor(projectId),
        checks: Array.isArray(project.checks) ? project.checks : [],
        preview: previews.get(projectId)?.url ?? null,
      }
    },

    /** Create a project. */
    async createProject(input) {
      return store.create(input)
    },

    /** Rename a project. */
    async renameProject(projectId, name) {
      const clean = typeof name === 'string' ? name.trim().slice(0, 80) : ''
      if (!clean) throw fail('invalid_input', 'name is required', repair('retry', 'Pass a name', 'Example: {"name":"我的主页"}'))
      return store.update(projectId, (project) => {
        project.name = clean
      })
    },

    /** Delete a project and its files. */
    async deleteProject(projectId) {
      const preview = previews.get(projectId)
      if (preview) {
        previews.delete(projectId)
        await preview.close().catch(() => {})
      }
      const removed = await store.remove(projectId)
      if (!removed) throw fail('not_found', `project ${JSON.stringify(projectId)} does not exist`, repair('list-projects', 'List projects', 'Call craft_projects with action="list".'))
      return { removed: true }
    },

    /** Start a study job. */
    startStudy(projectId, options = {}) {
      return jobs.start({ projectId, kind: 'study', label: '研究目标' }, async ({ signal, onProgress }) => {
        const project = await mustGet(projectId)
        const widths = normalizeWidths(Array.isArray(options.widths) && options.widths.length > 0 ? options.widths : config.widths)
        const maxRoutes = Number.isFinite(Number(options.maxPages)) ? Math.max(0, Math.min(LIMITS.maxPages, Math.round(Number(options.maxPages)))) : Math.max(0, config.maxPages - 1)
        const maxPages = maxRoutes + 1
        const paths = store.paths(projectId)
        await rmDir(paths.capture)
        await ensureDir(paths.capture)
        await store.update(projectId, (current) => {
          current.steps.study = { state: 'running', at: nowIso(), durationMs: 0 }
        })
        onProgress({ phase: 'capture', pct: 5, message: '启动无头浏览器' })
        let capture
        try {
          capture = await captureSite({
            pool,
            dir: paths.capture,
            url: project.target.url,
            widths,
            maxPages,
            noise: true,
            includeSource: project.mode === 'deep',
            onProgress,
            log,
            signal,
          })
        } catch (error) {
          await store.update(projectId, (current) => {
            current.steps.study = { state: 'failed', at: nowIso(), error: messageOf(error) }
          }).catch(() => {})
          throw error
        }
        const pages = capture.pages
        const captureSummary = summarizeCapture(pages, { durationMs: capture.durationMs, widths })
        const studiedAt = nowIso()
        const deepBytes = project.mode === 'deep' ? pages.reduce((sum, page) => sum + Object.values(page.documents ?? {}).reduce((inner, doc) => inner + String(doc.html?.length ?? 0), 0), 0) : 0
        const projectWithCapture = {
          ...project,
          capture: { ...captureSummary, studiedAt, limitations: capture.limitations, deepBytes },
        }
        const readme = captureReadme(projectWithCapture, pages)
        await writeFileAtomic(join(paths.capture, 'README.md'), readme)
        const evidence = studyEvidence({ ...project, capture: projectWithCapture.capture }, captureSummary, pages)
        await writeJsonAtomic(join(paths.capture, 'evidence.json'), evidence)
        await store.update(projectId, (current) => {
          current.capture = {
            ...captureSummary,
            studiedAt,
            limitations: capture.limitations,
            evidenceCount: evidence.length,
            deepBytes,
          }
          current.steps.study = { state: 'done', at: studiedAt, durationMs: capture.durationMs }
          current.status = 'studied'
          current.brief = null
          current.history = [...(current.history ?? []), { at: studiedAt, event: 'study', durationMs: capture.durationMs }].slice(-50)
        })
        onProgress({ phase: 'done', pct: 100, message: '研究完成' })
        return {
          projectId,
          pages: captureSummary.pages.length,
          widths: captureSummary.widths,
          durationMs: capture.durationMs,
          limitations: capture.limitations,
          evidenceCount: evidence.length,
          summary: captureSummary,
        }
      })
    },

    /** Start a check job. */
    startCheck(projectId, { url = '', appDir = '' } = {}) {
      return jobs.start({ projectId, kind: 'check', label: '校验重建' }, async ({ signal, onProgress }) => {
        const project = await mustGet(projectId)
        if (!project.capture) {
          throw fail('not_ready', 'this project has not been studied yet', repair('study-first', 'Study the target first', 'Call craft_study or run 研究 from the panel.'))
        }
        const paths = store.paths(projectId)
        const round = (Array.isArray(project.checks) ? project.checks.length : 0) + 1
        const roundDir = join(paths.checks, `round-${round}`)
        await ensureDir(roundDir)
        const startedAt = Date.now()
        let baseUrl = typeof url === 'string' ? url.trim() : ''
        let preview = null
        let servedDir = ''
        if (!baseUrl) {
          servedDir = await siteDirFor(projectId, appDir)
          if (!servedDir) {
            throw fail(
              'not_ready',
              'no built site found in the app folder',
              repair('build-first', 'Write the rebuilt app first', 'Write the site into the project app/ folder (an index.html, or dist/ / build/ / out/ with index.html), then run the check.'),
            )
          }
          preview = await startPreview(servedDir)
          baseUrl = preview.url
        }
        try {
          const pre = await preflight(baseUrl)
          if (!pre.ok) {
            throw fail('not_ready', `the build is not reachable at ${baseUrl} (HTTP ${pre.status || pre.error || 'error'})`, repair('serve-build', 'Serve the build', 'Start the dev server or point craft_check at the URL it prints.'))
          }
          onProgress({ phase: 'capture', pct: 5, message: '捕获重建版本' })
          const original = await loadCapture(paths.capture)
          if (!original) throw fail('not_ready', 'the study capture is missing; run the study again', repair('restudy', 'Study again', 'Call craft_study for this project.'))
          const buildCapture = await captureSite({
            pool,
            dir: join(roundDir, 'build'),
            url: baseUrl,
            widths: original.widths,
            maxPages: 1,
            routes: original.routes.map((route) => ({ path: route.path, slug: route.slug, url: new URL(route.path, baseUrl).href, title: route.title ?? '' })),
            noise: true,
            includeSource: false,
            onProgress,
            log,
            signal,
          })
          const built = await loadCapture(join(roundDir, 'build'))
          if (!built) throw new Error('the build capture could not be read back')
          const comparisons = []
          const unknowns = []
          const allClaims = []
          const notes = []
          const artifacts = []
          for (const originalPage of [original.start, ...original.routes]) {
            const builtPage = originalPage.dir === '' ? built.start : built.routes.find((route) => route.path === originalPage.path)
            if (!builtPage) {
              unknowns.push(`页面 ${originalPage.path || '/'} 在重建版本里没有找到对应页面`)
              continue
            }
            const perWidth = []
            for (const width of original.widths) {
              throwIfAborted(signal)
              const originalDoc = originalPage.documents?.[String(width)]
              const builtDoc = builtPage.documents?.[String(width)]
              if (!originalDoc || !builtDoc) {
                unknowns.push(`${originalPage.path || '/'} 在 ${width}px 的捕获缺失，无法比较`)
                continue
              }
              const originalImages = await readImagePair(paths.capture, originalPage.dir, width)
              const builtImages = await readImagePair(join(roundDir, 'build'), builtPage.dir, width)
              if (!originalImages.image || !builtImages.image) {
                unknowns.push(`${originalPage.path || '/'} 在 ${width}px 的截图缺失，无法比较`)
                continue
              }
              const comparison = compareViewport(originalImages.image, builtImages.image, {
                maskOriginal: originalImages.mask,
                maskBuilt: builtImages.mask,
              })
              const token = tokenSimilarity(originalDoc, builtDoc)
              const finalScore = combineScores({ layout: comparison.layout, detail: comparison.detail, tokens: token.score, heightRatio: comparison.heightRatio })
              if (config.includeDiffImages && finalScore < 99) {
                try {
                  const diff = diffImage(
                    originalImages.image,
                    builtImages.image,
                    { maskA: originalImages.mask, maskB: builtImages.mask },
                  )
                  const fileName = originalPage.dir === '' ? `diff-${width}.png` : `diff-${originalPage.slug}-${width}.png`
                  await writeFileAtomic(join(roundDir, fileName), encodePng(diff.rgba, diff.width, diff.height))
                  artifacts.push(`checks/round-${round}/${fileName}`)
                } catch (error) {
                  warn(`could not write the diff image for ${width}px: ${messageOf(error)}`)
                }
              }
              const text = textLikeness(originalDoc, builtDoc)
              const structure = structureLikeness(originalDoc, builtDoc)
              const design = designNotes(originalDoc, builtDoc)
              const health = healthNotes(originalDoc, builtDoc)
              const claims = buildClaims(originalDoc, builtDoc)
              perWidth.push({
                width,
                score: finalScore,
                layout: comparison.layout,
                detail: comparison.detail,
                token,
                imageScore: comparison.score,
                heightRatio: comparison.heightRatio,
                heights: comparison.heights,
                pixelDiff: { ratio: Math.round(comparison.pixel.ratio * 10000) / 10000, diffPixels: comparison.pixel.diffPixels },
                regions: comparison.regions,
                pixelDurationMs: comparison.durationMs,
                text,
                structure,
                design,
                health,
                claims,
              })
              allClaims.push(...claims.map((claim) => ({ ...claim, page: originalPage.path || '/' })))
            }
            if (perWidth.length === 0) {
              notes.push(`${originalPage.path || '/'}：没有可比较的宽度`)
              continue
            }
            const pageScore = aggregateScore(perWidth, WIDTH_WEIGHTS)
            const mergeUniq = (key) => [...new Set(perWidth.flatMap((row) => row[key] ?? []))]
            comparisons.push({
              page: originalPage.path || '/',
              dir: originalPage.dir,
              score: pageScore,
              perWidth,
              text: pickBest(perWidth, 'text', (a, b) => (a?.similarity ?? 0) - (b?.similarity ?? 0), 0),
              structure: pickBest(perWidth, 'structure', (a, b) => (a?.similarity ?? 0) - (b?.similarity ?? 0), 0),
              design: mergeUniq('design'),
              health: mergeUniq('health'),
              claims: dedupeClaims(perWidth.flatMap((row) => row.claims ?? [])),
            })
            notes.push(`${originalPage.path || '/'}：${pageScore} 分（${perWidth.map((row) => `${row.width}px ${row.score}`).join('、')}）`)
          }
          if (comparisons.length === 0) {
            throw new Error('nothing could be compared; check that the build serves the same pages as the original')
          }
          const score = Math.round((comparisons.reduce((sum, page) => sum + page.score, 0) / comparisons.length) * 10) / 10
          const grade = gradeForScore(score)
          const dedupedClaims = dedupeClaims(allClaims)
          const failedClaims = dedupedClaims.filter((claim) => !claim.passed)
          const designDiffs = [...new Set(comparisons.flatMap((page) => (page.design ?? []).slice(0, 8)))]
          const textNotes = comparisons
            .map((page) => (page.text ? { page: page.page, similarity: page.text.similarity, missingHeadings: page.text.missingHeadings.slice(0, 4), missingWords: page.text.missingWords.slice(0, 6) } : null))
            .filter(Boolean)
          const structureNotes = comparisons.map((page) => (page.structure ? { page: page.page, similarity: page.structure.similarity, missing: page.structure.missing.slice(0, 4) } : null)).filter(Boolean)
          const uniqueness = {
            score,
            grade,
            pages: comparisons.map((page) => ({ page: page.page, score: page.score })),
            failedClaims: failedClaims.slice(0, 20),
            text: pickBest(comparisons.map((page) => page.text), (a, b) => (a?.similarity ?? 0) - (b?.similarity ?? 0), 0),
            structure: pickBest(comparisons.map((page) => page.structure), (a, b) => (a?.similarity ?? 0) - (b?.similarity ?? 0), 0),
          }
          const durationMs = Date.now() - startedAt
          const record = {
            schemaVersion: 1,
            round,
            at: nowIso(),
            score,
            grade,
            durationMs,
            target: { url: baseUrl, servedDir },
            perPage: comparisons,
            notes,
            claims: dedupedClaims,
            unknowns,
            artifacts,
            best: false,
          }
          await writeJsonAtomic(join(roundDir, 'check.json'), record)
          const summary = {
            round,
            at: record.at,
            score,
            grade,
            durationMs,
            target: { url: baseUrl, servedDir },
            pages: comparisons.map((page) => ({ page: page.page, score: page.score })),
            perWidth: comparisons.flatMap((page) => page.perWidth.map((row) => ({ page: page.page, width: row.width, score: row.score, layout: row.layout, detail: row.detail, token: row.token?.score ?? null }))),
            notes,
            designNotes: designDiffs,
            textNotes,
            structureNotes,
            failedClaims: failedClaims.slice(0, 20),
            unknowns,
            artifacts,
            diffImages: artifacts,
          }
          const appBytes = await directoryBytes(paths.app).catch(() => null)
          await store.update(projectId, (current) => {
            const existing = Array.isArray(current.checks) ? current.checks : []
            const checks = [...existing, summary].slice(-LIMITS.maxChecks)
            current.checks = checks
            current.bestScore = Math.max(Number(current.bestScore) || 0, score)
            current.steps.build = { state: 'done', at: record.at }
            current.steps.check = { state: 'done', at: record.at, score, grade }
            current.steps.ready = score >= 90 ? { state: 'done', at: record.at } : { state: 'pending', at: null }
            current.status = score >= 90 ? 'ready' : 'checked'
            current.appBytes = appBytes
            current.history = [...(current.history ?? []), { at: record.at, event: 'check', round, score, grade, durationMs }].slice(-50)
          })
          onProgress({ phase: 'done', pct: 100, message: `校验完成：${score} 分` })
          return { ...record, full: undefined }
        } finally {
          if (preview) await preview.close().catch(() => {})
        }
      })
    },

    /** Generate and persist the build brief. */
    async brief(projectId) {
      const project = await mustGet(projectId)
      if (!project.capture) throw fail('not_ready', 'study the target before asking for a brief', repair('study-first', 'Study first', 'Call craft_study, then craft_brief.'))
      const paths = store.paths(projectId)
      const capture = await loadCapture(paths.capture)
      if (!capture) throw fail('not_ready', 'the capture files are missing; study again', repair('restudy', 'Study again', 'Call craft_study for this project.'))
      const evidence = (await readJsonFile(join(paths.capture, 'evidence.json'), [])) ?? []
      const brief = buildBrief({ project, capture, evidence })
      await writeFileAtomic(join(paths.capture, 'BRIEF.md'), brief.markdown)
      await store.update(projectId, (current) => {
        current.brief = { generatedAt: nowIso(), bytes: brief.bytes, truncated: brief.truncated }
      }).catch(() => {})
      return brief
    },

    /** One page of evidence. */
    async evidence(projectId, options) {
      const project = await mustGet(projectId)
      const paths = store.paths(projectId)
      const records = (await readJsonFile(join(paths.capture, 'evidence.json'), [])) ?? []
      return { projectId, ...pageEvidence(records, options), summary: evidenceSummary(records) }
    },

    /** Start (or reuse) a local preview of the built site. */
    async preview(projectId) {
      const existing = previews.get(projectId)
      if (existing) return { url: existing.url, port: existing.port }
      const dir = await siteDirFor(projectId, '')
      if (!dir) throw fail('not_ready', 'no built site found in the app folder', repair('build-first', 'Write the app first', 'Look for an index.html in app/, dist/, build/ or out/.'))
      const server = await startPreview(dir)
      previews.set(projectId, { ...server, dir })
      return { url: server.url, port: server.port }
    },

    /** Open a project folder in the OS file manager (best effort, loopback only). */
    async openFolder(projectId) {
      const paths = store.paths(projectId)
      await mustGet(projectId)
      if (process.platform !== 'win32') return { opened: false, reason: 'only Windows Explorer is wired up' }
      try {
        const child = spawn('explorer.exe', [paths.root], { detached: true, stdio: 'ignore', windowsHide: false })
        child.unref()
        return { opened: true }
      } catch (error) {
        return { opened: false, reason: messageOf(error) }
      }
    },

    /** Diagnostics for the panel. */
    async diagnostics() {
      const projects = await store.list()
      return {
        version: '0.2.0',
        dataDir: store.dataDir,
        browser: pool.availability(),
        projects: projects.length,
        jobs: jobs.recentFor(projects[0]?.id ?? '', 5),
        checks: projects.reduce((sum, project) => sum + (project.checks ?? 0), 0),
        config,
        platform: process.platform,
        node: process.version,
      }
    },

    /** Cancel one job. */
    cancelJob(jobId) {
      return jobs.cancel(jobId)
    },

    /** Stop background resources (jobs, previews); the browser pool is stopped by index.js. */
    async dispose() {
      jobs.dispose()
      for (const entry of previews.values()) await entry.close().catch(() => {})
      previews.clear()
    },
  }
}

/** Read a screenshot + its noise mask from a capture directory. */
async function readImagePair(captureDir, pageDir, width) {
  const base = pageDir ? join(captureDir, pageDir) : captureDir
  let image = null
  let mask = null
  try {
    image = decodePng(await readFile(join(base, screenshotFileFor(width))))
  } catch {
    image = null
  }
  try {
    mask = decodePng(await readFile(join(base, noiseFileFor(width))))
  } catch {
    mask = null
  }
  return { image, mask }
}

/** Deduplicate claims captured once per width. */
function dedupeClaims(claims) {
  const seen = new Set()
  const out = []
  for (const claim of Array.isArray(claims) ? claims : []) {
    const key = `${claim.page ?? ''}|${claim.title}|${claim.passed}|${claim.detail ?? ''}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(claim)
  }
  return out
}

/** Pick the most representative value from per-width rows. */
function pickBest(rows, key, compare, fallback) {
  let best = fallback
  for (const row of rows) {
    const value = row?.[key]
    if (value === undefined || value === null) continue
    if (best === fallback || compare(value, best) > 0) best = value
  }
  return best
}

/** Throw when an abort signal fired. */
function throwIfAborted(signal) {
  if (signal?.aborted) {
    const error = new Error('job cancelled')
    error.code = 'cancelled'
    throw error
  }
}
