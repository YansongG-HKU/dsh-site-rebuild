/**
 * dsh-site-rebuild — the durable project store.
 *
 * Layout under `<dataDir>/projects/<id>/`:
 *   craft.json              project record (versioned, atomically replaced)
 *   capture/                what the study recorded (screenshots, capture.json, README.md)
 *   app/                    where a build is written (the agent writes here)
 *   checks/round-<n>/       each comparison against the original
 *
 * Writes for one project are serialised in-process; a crash between temp file
 * and rename leaves the previous craft.json intact.
 */

import { existsSync } from 'node:fs'
import { readdir, readFile, rm, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { LIMITS, SCHEMA_VERSION } from './config.js'
import {
  ensureDir,
  isPlainObject,
  messageOf,
  newProjectId,
  nowIso,
  pathExists,
  readJsonFile,
  slugify,
  writeJsonAtomic,
} from './util.js'

/** One project's folders, resolved from its id. */
export function projectPaths(dataDir, id) {
  const root = join(dataDir, 'projects', id)
  return {
    root,
    record: join(root, 'craft.json'),
    capture: join(root, 'capture'),
    app: join(root, 'app'),
    checks: join(root, 'checks'),
  }
}

/** A fresh project record. */
export function newProjectRecord({ id, name, target, request, mode, stack, widths }) {
  const at = nowIso()
  return {
    schemaVersion: SCHEMA_VERSION,
    id,
    name,
    createdAt: at,
    updatedAt: at,
    target,
    request,
    mode: mode === 'deep' ? 'deep' : 'clean',
    stack: typeof stack === 'string' ? stack.trim().slice(0, 120) : '',
    status: 'draft',
    steps: {
      study: { state: 'pending', at: null, durationMs: 0 },
      build: { state: 'pending', at: null },
      check: { state: 'pending', at: null, score: null },
      ready: { state: 'pending', at: null },
    },
    capture: null,
    brief: null,
    checks: [],
    bestScore: null,
    history: [],
  }
}

/** Structural validation for a record read back from disk. */
export function validProjectRecord(value) {
  if (!isPlainObject(value)) return false
  if (value.schemaVersion !== SCHEMA_VERSION) return false
  if (typeof value.id !== 'string' || !/^craft-[a-z0-9-]+$/u.test(value.id)) return false
  if (!isPlainObject(value.target) || typeof value.target.url !== 'string') return false
  if (!Array.isArray(value.checks)) return false
  return true
}

/**
 * Create the project store.
 * @param {{dir: string, log?: {warn: Function}}} options
 */
export function createStore({ dir, log } = {}) {
  if (typeof dir !== 'string' || dir.length === 0) throw new Error('the project store needs a directory')
  const dataDir = dir
  const projectsDir = join(dataDir, 'projects')
  /** Serialise each project's writes by id. */
  const locks = new Map()

  const warn = (message) => {
    try {
      log?.warn?.(message)
    } catch {
      /* logging never breaks the store */
    }
  }

  /** Run one update under the project's lock. */
  const withLock = async (id, action) => {
    const previous = locks.get(id) ?? Promise.resolve()
    const run = previous.then(action, action)
    const tail = run.catch(() => {})
    locks.set(id, tail)
    try {
      return await run
    } finally {
      if (locks.get(id) === tail) locks.delete(id)
    }
  }

  const recordPath = (id) => projectPaths(dataDir, id).record

  /** Read one record, or null. */
  async function readRecord(id) {
    if (typeof id !== 'string' || !/^craft-[a-z0-9-]+$/u.test(id)) return null
    const value = await readJsonFile(recordPath(id), null)
    return validProjectRecord(value) ? value : null
  }

  /** Write one record atomically. */
  async function writeRecord(project) {
    project.updatedAt = nowIso()
    await writeJsonAtomic(recordPath(project.id), project)
  }

  return {
    dataDir,
    projectsDir,

    /** Ensure the store root exists. */
    async init() {
      await ensureDir(projectsDir)
      return this
    },

    /** Every project's light summary, newest first. */
    async list() {
      let entries = []
      try {
        entries = await readdir(projectsDir, { withFileTypes: true })
      } catch {
        return []
      }
      const rows = []
      for (const entry of entries) {
        if (!entry.isDirectory()) continue
        const record = await readJsonFile(join(projectsDir, entry.name, 'craft.json'), null)
        if (!validProjectRecord(record)) continue
        rows.push(summaryOf(record))
      }
      rows.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
      return rows
    },

    /** Count live projects. */
    async count() {
      try {
        const entries = await readdir(projectsDir, { withFileTypes: true })
        return entries.filter((entry) => entry.isDirectory()).length
      } catch {
        return 0
      }
    },

    /** Read one full record. */
    get: readRecord,

    /** Create one project and its folders. */
    async create({ url, request, mode, stack, name, widths }) {
      const count = await this.count()
      if (count >= LIMITS.maxProjects) {
        throw Object.assign(new Error(`project limit reached (${LIMITS.maxProjects}); delete a project first`), { code: 'too_many' })
      }
      let parsed
      try {
        parsed = new URL(url)
      } catch {
        throw Object.assign(new Error(`not a valid URL: ${String(url)}`), { code: 'invalid_input' })
      }
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw Object.assign(new Error('only http(s) URLs can be studied'), { code: 'invalid_input' })
      }
      const id = newProjectId()
      const paths = projectPaths(dataDir, id)
      await ensureDir(paths.root)
      await ensureDir(paths.capture)
      await ensureDir(paths.app)
      await ensureDir(paths.checks)
      const host = parsed.hostname.replace(/^www\./u, '')
      const record = newProjectRecord({
        id,
        name: (typeof name === 'string' && name.trim().slice(0, 80)) || host || slugify(url),
        target: {
          url: parsed.toString(),
          origin: parsed.origin,
          host: parsed.hostname,
          path: parsed.pathname || '/',
        },
        request: typeof request === 'string' ? request.trim().slice(0, 2000) : '',
        mode: mode === 'deep' ? 'deep' : 'clean',
        stack: stack ?? '',
        widths,
      })
      await writeRecord(record)
      return record
    },

    /** Atomically mutate one project; the mutator may be async. */
    async update(id, mutate) {
      return withLock(id, async () => {
        const project = await readRecord(id)
        if (!project) {
          throw Object.assign(new Error(`project ${JSON.stringify(id)} does not exist`), { code: 'not_found' })
        }
        const result = await mutate(project)
        if (result === false) return project
        await writeRecord(project)
        return project
      })
    },

    /** Save a full record (caller holds the lock when it matters). */
    async save(project) {
      return withLock(project.id, async () => {
        await writeRecord(project)
        return project
      })
    },

    /** Delete one project and all its files. */
    async remove(id) {
      const record = await readRecord(id)
      if (!record) return false
      await rm(projectPaths(dataDir, id).root, { recursive: true, force: true })
      return true
    },

    /** Absolute paths for one project. */
    paths(id) {
      return projectPaths(dataDir, id)
    },

    /** Resolve a project file path, refusing anything outside the project root. */
    safeFile(id, relative) {
      const root = projectPaths(dataDir, id).root
      const target = join(root, String(relative ?? '').replace(/\\/gu, '/'))
      const normalizedRoot = root.endsWith('/') ? root : root + '\\'
      const normalizedTarget = target.replace(/\//gu, '\\')
      if (!normalizedTarget.startsWith(normalizedRoot)) return null
      return target
    },

    /** File existence + size for the panel. */
    async statFile(id, relative) {
      const path = this.safeFile(id, relative)
      if (!path || !existsSync(path)) return null
      try {
        const info = await stat(path)
        return info.isFile() ? { path, size: info.size } : null
      } catch (error) {
        warn(`stat failed for ${relative}: ${messageOf(error)}`)
        return null
      }
    },

    /** Read a UTF-8 file under the project root, or null. */
    async readFile(id, relative) {
      const path = this.safeFile(id, relative)
      if (!path) return null
      try {
        return await readFile(path)
      } catch {
        return null
      }
    },
  }
}

/** The light shape the panel's project list needs. */
export function summaryOf(project) {
  const capture = project.capture
  const lastCheck = Array.isArray(project.checks) && project.checks.length > 0 ? project.checks[project.checks.length - 1] : null
  return {
    id: project.id,
    name: project.name,
    url: project.target?.url ?? '',
    request: project.request ?? '',
    mode: project.mode ?? 'clean',
    status: project.status ?? 'draft',
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    steps: project.steps,
    widths: capture?.widths ?? [],
    pageCount: capture?.pages?.length ?? 0,
    pages: Array.isArray(capture?.pages) ? capture.pages.map((page) => ({ path: page.path, slug: page.slug, title: page.title, pageH: page.pageH, width: page.width })) : [],
    bestScore: project.bestScore,
    lastScore: lastCheck?.score ?? null,
    checks: Array.isArray(project.checks) ? project.checks.length : 0,
    captureAt: capture?.studiedAt ?? null,
    durationMs: capture?.durationMs ?? 0,
    appBytes: project.appBytes ?? null,
  }
}

/** True when the record's folder is intact. */
export function projectFolderExists(dataDir, id) {
  return pathExists(projectPaths(dataDir, id).record)
}
