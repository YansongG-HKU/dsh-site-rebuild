/**
 * dsh-site-rebuild — Host half of the panel.
 *
 * Loopback, same-origin JSON routes for the Client panel plus a binary route for
 * project files (screenshots, noise masks, diff images). Defence:
 *   - registered through the optional `webServer` service, so a headless
 *     profile still activates the tools;
 *   - every request carries this plugin's header, a loopback Host and, when
 *     present, a matching loopback Origin;
 *   - file reads resolve inside the project root only;
 *   - JSON bodies are capped; every failure is structured JSON.
 */

import { readFile } from 'node:fs/promises'
import { extname, join } from 'node:path'
import { LIMITS, PLUGIN_NAME, REQUEST_HEADER, ROUTE_PREFIX } from './config.js'
import { isPlainObject, messageOf } from './util.js'

const GET = 'GET'
const POST = 'POST'

/** Binary types the panel may fetch from a project folder. */
const BINARY_TYPES = {
  '.png': 'image/png',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
}

/** Route table: `route` is the dispatch key, patterns anchored. */
export const ROUTES = Object.freeze([
  { route: 'state', methods: [GET], pattern: /^\/dsh-site-rebuild\/api\/state$/u },
  { route: 'projects', methods: [GET, POST], pattern: /^\/dsh-site-rebuild\/api\/projects$/u },
  { route: 'project', methods: [GET], pattern: /^\/dsh-site-rebuild\/api\/projects\/([^/]+)$/u },
  { route: 'study', methods: [POST], pattern: /^\/dsh-site-rebuild\/api\/projects\/([^/]+)\/study$/u },
  { route: 'check', methods: [POST], pattern: /^\/dsh-site-rebuild\/api\/projects\/([^/]+)\/check$/u },
  { route: 'delete', methods: [POST], pattern: /^\/dsh-site-rebuild\/api\/projects\/([^/]+)\/delete$/u },
  { route: 'rename', methods: [POST], pattern: /^\/dsh-site-rebuild\/api\/projects\/([^/]+)\/rename$/u },
  { route: 'job', methods: [GET], pattern: /^\/dsh-site-rebuild\/api\/projects\/([^/]+)\/job$/u },
  { route: 'jobs', methods: [GET], pattern: /^\/dsh-site-rebuild\/api\/projects\/([^/]+)\/jobs$/u },
  { route: 'evidence', methods: [GET], pattern: /^\/dsh-site-rebuild\/api\/projects\/([^/]+)\/evidence$/u },
  { route: 'brief', methods: [GET, POST], pattern: /^\/dsh-site-rebuild\/api\/projects\/([^/]+)\/brief$/u },
  { route: 'preview', methods: [POST], pattern: /^\/dsh-site-rebuild\/api\/projects\/([^/]+)\/preview$/u },
  { route: 'open', methods: [POST], pattern: /^\/dsh-site-rebuild\/api\/projects\/([^/]+)\/open$/u },
  { route: 'file', methods: [GET], pattern: /^\/dsh-site-rebuild\/api\/projects\/([^/]+)\/file$/u },
  { route: 'cancel', methods: [POST], pattern: /^\/dsh-site-rebuild\/api\/jobs\/([^/]+)\/cancel$/u },
  { route: 'diagnostics', methods: [GET], pattern: /^\/dsh-site-rebuild\/api\/diagnostics$/u },
])

/** Map a failure code to an HTTP status. */
export function statusForCode(code) {
  switch (code) {
    case 'invalid_input':
      return 400
    case 'forbidden':
      return 403
    case 'not_found':
      return 404
    case 'method_not_allowed':
      return 405
    case 'busy':
    case 'conflict':
      return 409
    case 'too_large':
      return 413
    case 'not_ready':
    case 'no_browser':
      return 503
    case 'timeout':
      return 504
    default:
      return 500
  }
}

/** Derive the server origin, tolerating stub servers in tests. */
export function serverOrigin(webServer) {
  try {
    const origin = webServer?.getOrigin?.()
    if (typeof origin === 'string' && origin.length > 0) return origin
  } catch {
    /* not bound yet */
  }
  const port = Number(webServer?.port)
  if (Number.isFinite(port) && port > 0) return `http://127.0.0.1:${port}`
  return ''
}

/** Treat 127.0.0.1 / localhost / [::1] as the same loopback peer. */
function sameLoopbackOrigin(a, b) {
  try {
    const first = new URL(a)
    const second = new URL(b)
    const loopback = new Set(['127.0.0.1', 'localhost', '[::1]', '::1'])
    return first.protocol === second.protocol && first.port === second.port && loopback.has(first.hostname) && loopback.has(second.hostname)
  } catch {
    return false
  }
}

/** The same-origin / localhost / header gate. */
export function checkRequestGate(webServer, req) {
  const headers = isPlainObject(req?.headers) ? req.headers : {}
  const marker = headers[REQUEST_HEADER]
  const hasMarker = marker === '1' || (Array.isArray(marker) && marker.includes('1'))
  if (!hasMarker) return { ok: false, reason: `missing ${REQUEST_HEADER}: 1 header` }
  const host = typeof headers.host === 'string' ? headers.host : ''
  if (host.length === 0) return { ok: false, reason: 'missing Host header' }
  const hostname = host.replace(/:\d+$/u, '').toLowerCase()
  const loopback = hostname === '127.0.0.1' || hostname === 'localhost' || hostname === '[::1]' || hostname === '::1'
  if (!loopback) return { ok: false, reason: 'non-loopback Host header' }
  const origin = headers.origin
  if (origin !== undefined) {
    if (typeof origin !== 'string' || origin.length === 0) return { ok: false, reason: 'invalid Origin header' }
    const expected = serverOrigin(webServer)
    if (!expected) return { ok: true }
    if (origin !== expected && !sameLoopbackOrigin(origin, expected)) return { ok: false, reason: 'Origin does not match this server' }
  }
  return { ok: true }
}

/** True when the Host header names a loopback authority. */
export function checkLoopbackHost(req) {
  const headers = isPlainObject(req?.headers) ? req.headers : {}
  const host = typeof headers.host === 'string' ? headers.host : ''
  if (host.length === 0) return false
  const hostname = host.replace(/:\d+$/u, '').toLowerCase()
  return hostname === '127.0.0.1' || hostname === 'localhost' || hostname === '[::1]' || hostname === '::1'
}

/** Register the panel route. */
export function registerPanel({ ctx, service, log }) {
  if (!ctx || typeof ctx.inject !== 'function') return null
  const warn = (message) => {
    try {
      log?.warn?.(message)
    } catch {
      /* logging never breaks registration */
    }
  }
  try {
    return ctx.inject(['webServer'], (webCtx) => {
      const webServer = webCtx?.webServer
      if (!webServer || typeof webServer.register !== 'function') return null
      const register = () => {
        const dispose = webServer.register({
          kind: 'prefix',
          path: ROUTE_PREFIX,
          handler: (req, res) => {
            void handleRequest(webCtx, service, req, res)
          },
        })
        return dispose
      }
      if (typeof webCtx.effect === 'function') return webCtx.effect(register, 'dsh-site-rebuild: panel routes')
      return register()
    })
  } catch (error) {
    warn(`could not register the panel routes: ${messageOf(error)}`)
    return null
  }
}

/** Match one route descriptor. */
export function matchRoute(pathname) {
  for (const descriptor of ROUTES) {
    const match = descriptor.pattern.exec(pathname)
    if (!match) continue
    return { descriptor, params: match.slice(1).map((value) => { try { return decodeURIComponent(value) } catch { return value } }) }
  }
  return null
}

/** Handle one HTTP request; never throws. */
export async function handleRequest(webCtx, service, req, res) {
  try {
    let url
    try {
      url = new URL(String(req.url ?? '/'), 'http://localhost')
    } catch {
      sendJson(res, 400, { ok: false, code: 'invalid_input', error: 'invalid request URL' })
      return
    }
    const match = matchRoute(url.pathname)
    if (!match) {
      sendJson(res, 404, { ok: false, code: 'not_found', error: 'unknown route' })
      return
    }
    // <img> requests cannot carry the plugin header. Project files are therefore
    // gated by loopback authority only; the path is still confined to the
    // project root, and the route is read-only.
    if (match.descriptor.route === 'file') {
      if (!checkLoopbackHost(req)) {
        sendJson(res, 403, { ok: false, code: 'forbidden', error: 'loopback request required' })
        return
      }
      const method = String(req.method ?? 'GET').toUpperCase()
      if (method !== GET && method !== 'HEAD') {
        sendJson(res, 405, { ok: false, code: 'method_not_allowed', error: 'file route is read-only' }, { allow: 'GET, HEAD' })
        return
      }
      await serveProjectFile(res, service, match.params[0], url.searchParams.get('path'), method === 'HEAD')
      return
    }
    const gate = checkRequestGate(webCtx?.webServer ?? null, req)
    if (!gate.ok) {
      sendJson(res, 403, { ok: false, code: 'forbidden', error: `same-origin ${PLUGIN_NAME} request required: ${gate.reason}` })
      return
    }
    const method = String(req.method ?? 'GET').toUpperCase()
    if (!match.descriptor.methods.includes(method)) {
      sendJson(res, 405, { ok: false, code: 'method_not_allowed', error: `method ${method} is not allowed` }, { allow: match.descriptor.methods.join(', ') })
      return
    }
    const body = method === 'POST' ? await readJsonBody(req) : {}
    const result = await dispatch({ service, match, url, body, method })
    if (!isPlainObject(result) || result.ok !== true) {
      const code = isPlainObject(result) ? result.code ?? 'failed' : 'failed'
      sendJson(res, statusForCode(code), isPlainObject(result) ? result : { ok: false, code, error: 'empty handler result' })
      return
    }
    sendJson(res, 200, result)
  } catch (error) {
    const code = error?.code === 'too_large' ? 'too_large' : error?.code === 'invalid_input' ? 'invalid_input' : error?.code ?? 'failed'
    try {
      sendJson(res, statusForCode(code), { ok: false, code, error: messageOf(error), repair: error?.repair })
    } catch {
      /* response already gone */
    }
  }
}

/** Execute one route. */
export async function dispatch({ service, match, url, body, method }) {
  const { descriptor, params } = match
  const projectId = params[0]
  switch (descriptor.route) {
    case 'state': {
      const projects = await service.listProjects()
      return { ok: true, data: { ...service.overview(), projects } }
    }
    case 'projects':
      if (method === 'POST') return { ok: true, project: await service.createProject(projectInput(body)) }
      return { ok: true, projects: await service.listProjects() }
    case 'project':
      return { ok: true, data: await service.projectDetail(projectId) }
    case 'study':
      return { ok: true, job: service.startStudy(projectId) }
    case 'check':
      return { ok: true, job: service.startCheck(projectId, { url: stringOrEmpty(body?.url), appDir: stringOrEmpty(body?.appDir) }) }
    case 'delete':
      return { ok: true, ...(await service.deleteProject(projectId)) }
    case 'rename':
      return { ok: true, project: await service.renameProject(projectId, body?.name) }
    case 'job':
      return { ok: true, job: service.jobs.latestFor(projectId) }
    case 'jobs':
      return { ok: true, jobs: service.jobs.recentFor(projectId, 8) }
    case 'evidence': {
      const offset = Number(url.searchParams.get('offset') ?? body?.offset ?? 0)
      const limit = Number(url.searchParams.get('limit') ?? body?.limit ?? 10)
      const kind = url.searchParams.get('kind') ?? body?.kind ?? ''
      return { ok: true, data: await service.evidence(projectId, { offset, limit, kind }) }
    }
    case 'brief': {
      const brief = await service.brief(projectId)
      return { ok: true, brief }
    }
    case 'preview':
      return { ok: true, preview: await service.preview(projectId) }
    case 'open':
      return { ok: true, ...(await service.openFolder(projectId)) }
    case 'cancel':
      return { ok: true, cancelled: service.cancelJob(params[0]) }
    case 'diagnostics':
      return { ok: true, data: await service.diagnostics() }
    default:
      return { ok: false, code: 'not_found', error: 'unknown route' }
  }
}

/** The POST /api/projects input shape. */
function projectInput(body) {
  const input = isPlainObject(body) ? body : {}
  return {
    url: stringOrEmpty(input.url),
    request: stringOrEmpty(input.request),
    mode: input.mode === 'deep' ? 'deep' : 'clean',
    stack: stringOrEmpty(input.stack),
    name: stringOrEmpty(input.name),
  }
}

function stringOrEmpty(value) {
  return typeof value === 'string' ? value.trim() : ''
}

/**
 * Candidate project-relative paths for a requested binary file.
 *
 * Screenshots and noise masks live under `capture/` (and
 * `capture/routes/<slug>/`), but older panel states and hand-written links may
 * still pass the bare file name. Try the literal path first and then the
 * capture-folder fallbacks so a stale client cannot show broken images.
 */
export function fileCandidates(relative) {
  if (typeof relative !== 'string' || relative.length === 0) return []
  const candidates = [relative]
  for (const pattern of [/^(?:screenshot|noise)-\d+\.png$/u, /^routes\/[^/]+\/(?:screenshot|noise)-\d+\.png$/u]) {
    if (pattern.test(relative)) candidates.push(`capture/${relative}`)
  }
  return candidates
}

/** Stream a project file (screenshots etc.) after a root check. */
async function serveProjectFile(res, service, projectId, relative, headOnly = false) {
  if (typeof relative !== 'string' || relative.length === 0) {
    sendJson(res, 400, { ok: false, code: 'invalid_input', error: 'path is required' })
    return
  }
  let info = null
  for (const candidate of fileCandidates(relative)) {
    info = await service.store.statFile(projectId, candidate)
    if (info) break
  }
  if (!info || info.size > LIMITS.maxImageBytes) {
    sendJson(res, 404, { ok: false, code: 'not_found', error: 'file not found' })
    return
  }
  const type = BINARY_TYPES[extname(info.path).toLowerCase()] ?? 'application/octet-stream'
  if (res.headersSent || res.writableEnded) return
  res.writeHead(200, {
    'content-type': type,
    'content-length': String(info.size),
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
  })
  if (headOnly) {
    res.end()
    return
  }
  let data
  try {
    data = await readFile(info.path)
  } catch {
    res.end()
    return
  }
  res.end(data)
}

/** Read a bounded JSON body. */
export async function readJsonBody(req, maxBytes = LIMITS.maxBodyBytes) {
  const chunks = []
  let total = 0
  if (req && typeof req[Symbol.asyncIterator] === 'function') {
    for await (const chunk of req) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
      total += buffer.length
      if (total > maxBytes) {
        const error = new Error(`request body exceeds ${maxBytes} bytes`)
        error.code = 'too_large'
        throw error
      }
      chunks.push(buffer)
    }
  }
  if (total === 0) return {}
  const text = Buffer.concat(chunks).toString('utf8').trim()
  if (text.length === 0) return {}
  try {
    return JSON.parse(text)
  } catch {
    const error = new Error('request body must be valid JSON')
    error.code = 'invalid_input'
    throw error
  }
}

/** Send one JSON response. */
export function sendJson(res, status, value, extraHeaders) {
  try {
    if (!res || res.headersSent || res.writableEnded) return
    const payload = JSON.stringify(value === undefined ? {} : value)
    res.writeHead(status, {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      'content-length': String(Buffer.byteLength(payload, 'utf8')),
      ...(isPlainObject(extraHeaders) ? extraHeaders : {}),
    })
    res.end(payload)
  } catch {
    /* dead responses are fine */
  }
}
