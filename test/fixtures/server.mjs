/**
 * A tiny static fixture server for the integration tests.
 *
 * Serves `test/fixtures/site` with the same static-hosting conventions the
 * plugin's preview server uses: `/` → index.html, an extension-less path may map
 * to `<path>.html`, everything else is a file.
 */

import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import http from 'node:http'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('.', import.meta.url)) + 'site'

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.json': 'application/json; charset=utf-8',
}

/** Resolve a URL path inside the fixture root. */
function resolvePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0])
  const clean = normalize(decoded).replace(/^([/\\])+/u, '')
  let path = join(ROOT, clean)
  if (path === ROOT || decoded === '/' || decoded === '') path = join(ROOT, 'index.html')
  return path
}

/** Start the fixture server. */
export async function startFixtureServer() {
  const server = http.createServer(async (req, res) => {
    try {
      let path = resolvePath(req.url || '/')
      let info = await stat(path).catch(() => null)
      if (!info?.isFile() && !extname(path)) {
        const html = path + '.html'
        const htmlInfo = await stat(html).catch(() => null)
        if (htmlInfo?.isFile()) {
          path = html
          info = htmlInfo
        }
      }
      if (!info?.isFile()) {
        res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
        res.end('not found')
        return
      }
      res.writeHead(200, { 'content-type': MIME[extname(path).toLowerCase()] ?? 'application/octet-stream', 'content-length': String(info.size), 'cache-control': 'no-store' })
      createReadStream(path).pipe(res)
    } catch {
      try {
        res.writeHead(500)
        res.end('fixture failure')
      } catch {
        /* already gone */
      }
    }
  })
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      server.off('error', reject)
      resolve()
    })
  })
  const address = server.address()
  const port = typeof address === 'object' && address ? address.port : 0
  return {
    url: `http://127.0.0.1:${port}/`,
    port,
    close: () =>
      new Promise((resolve) => {
        server.close(() => resolve())
        setTimeout(() => {
          try {
            server.closeAllConnections?.()
          } catch {
            /* older runtimes */
          }
          resolve()
        }, 500)
      }),
  }
}
