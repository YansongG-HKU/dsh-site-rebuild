/**
 * dsh-site-rebuild — local preview server.
 *
 * Serves a built app folder on loopback so the likeness check can photograph it
 * with the same browser that studied the original. No directory listing, no
 * writes, no traversal, GET/HEAD only; a missing extension-less path falls back
 * to index.html so client-side routers work.
 */

import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import http from 'node:http'
import { extname, join, normalize, resolve, sep } from 'node:path'

/** MIME types the preview can serve. */
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.cjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.wasm': 'application/wasm',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
}

/** Static servers started by this plugin. */
const servers = new Set()

/**
 * Start a static preview of `rootDir`.
 * @param {string} rootDir absolute directory to serve
 * @returns {Promise<{url: string, port: number, close: Function}>}
 */
export async function startPreview(rootDir) {
  const root = resolve(rootDir)
  const rootInfo = await stat(root).catch(() => null)
  if (!rootInfo || !rootInfo.isDirectory()) throw new Error(`preview folder does not exist: ${root}`)
  const server = http.createServer((req, res) => {
    void handle(req, res, root)
  })
  server.keepAliveTimeout = 5000
  await new Promise((resolvePromise, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      server.off('error', reject)
      resolvePromise()
    })
  })
  const address = server.address()
  const port = typeof address === 'object' && address ? address.port : 0
  const entry = {
    url: `http://127.0.0.1:${port}/`,
    port,
    root,
    close: () =>
      new Promise((resolvePromise) => {
        servers.delete(entry)
        server.close(() => resolvePromise())
        setTimeout(() => {
          try {
            server.closeAllConnections?.()
          } catch {
            /* older runtimes have no closeAllConnections */
          }
          resolvePromise()
        }, 800)
      }),
  }
  servers.add(entry)
  return entry
}

/** Close every preview server (plugin disposal). */
export async function closeAllPreviews() {
  const all = [...servers]
  await Promise.all(all.map((entry) => entry.close().catch(() => {})))
}

/** Resolve a URL path inside the root, or null on traversal. */
export function safeJoin(root, urlPath) {
  let decoded
  try {
    decoded = decodeURIComponent(urlPath.split('?')[0].split('#')[0])
  } catch {
    return null
  }
  if (decoded.includes('\0')) return null
  const normalized = normalize(decoded).replace(/^([/\\])+/u, '')
  const target = join(root, normalized)
  const rootWithSep = root.endsWith(sep) ? root : root + sep
  return target === root || target.startsWith(rootWithSep) ? target : null
}

/** Serve one request. */
async function handle(req, res, root) {
  try {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { allow: 'GET, HEAD' })
      res.end()
      return
    }
    let path = safeJoin(root, req.url || '/')
    if (!path) {
      res.writeHead(403)
      res.end('forbidden')
      return
    }
    let info = await stat(path).catch(() => null)
    if (info?.isDirectory()) {
      path = join(path, 'index.html')
      info = await stat(path).catch(() => null)
    }
    if (!info?.isFile()) {
      // Static-hosting behaviour: an extension-less route may map to `<path>.html`
      // (so /work serves work.html), then a Client-side router falls back to index.html.
      const extension = extname(path)
      if (!extension) {
        const htmlPath = path + '.html'
        const htmlInfo = await stat(htmlPath).catch(() => null)
        if (htmlInfo?.isFile()) {
          path = htmlPath
          info = htmlInfo
        } else {
          const fallback = join(root, 'index.html')
          const fallbackInfo = await stat(fallback).catch(() => null)
          if (fallbackInfo?.isFile()) {
            path = fallback
            info = fallbackInfo
          }
        }
      }
    }
    if (!info?.isFile()) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
      res.end('not found')
      return
    }
    const headers = {
      'content-type': MIME[extname(path).toLowerCase()] ?? 'application/octet-stream',
      'content-length': String(info.size),
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    }
    res.writeHead(200, headers)
    if (req.method === 'HEAD') {
      res.end()
      return
    }
    const stream = createReadStream(path)
    stream.on('error', () => {
      try {
        res.destroy()
      } catch {
        /* already gone */
      }
    })
    stream.pipe(res)
  } catch {
    try {
      res.writeHead(500)
      res.end('preview failure')
    } catch {
      /* already gone */
    }
  }
}

/**
 * Find the built site inside a project's app folder: an index.html directly, or
 * the usual `dist/`, `build/`, `out/`, `public/` folders.
 * @param {string} appDir
 * @returns {Promise<string|null>} the folder to serve
 */
export async function detectSiteDir(appDir) {
  const direct = join(appDir, 'index.html')
  if ((await stat(direct).catch(() => null))?.isFile()) return appDir
  for (const name of ['dist', 'build', 'out', 'public', 'site']) {
    const candidate = join(appDir, name)
    const index = join(candidate, 'index.html')
    if ((await stat(index).catch(() => null))?.isFile()) return candidate
  }
  return null
}
