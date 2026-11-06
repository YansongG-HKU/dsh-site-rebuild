/**
 * dsh-site-rebuild — page and site capture.
 *
 * One browser context carries a whole study: the same page object is resized to
 * each viewport, warmed by scrolling through the document (lazy images and
 * observers run), frozen (animations finished, videos paused), extracted, and
 * photographed twice. The second photograph is compared with the first to build
 * a noise mask: anything that changes by itself is excluded from the likeness
 * score instead of penalising the rebuild.
 *
 * Files written for one page (under a capture directory):
 *   page.json            { schemaVersion, widths: { "<w>": document } }
 *   screenshot-<w>.png   full-page capture
 *   noise-<w>.png        white = ignore (self-changing regions)
 */

import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { LIMITS } from './config.js'
import { EXTRACT_SCRIPT, FREEZE_SCRIPT, WARM_SCRIPT } from './extract.js'
import { noiseMask } from './diff.js'
import { computeDesign, computeLayout, compactExtras } from './tokens.js'
import { decodePng, pngSize } from './png.js'
import { ensureDir, messageOf, nowIso } from './util.js'

/** Pixels of margin around self-changing media that the noise mask also ignores. */
const DYNAMIC_MARGIN = 8

/**
 * Capture one URL at every width, writing files into `dir`.
 * @param {object} options
 * @param {import('./browser.js').BrowserPage} options.page
 * @param {string} options.dir
 * @param {string} options.url
 * @param {number[]} options.widths
 * @param {boolean} [options.noise]
 * @param {boolean} [options.includeSource] deep mode: also keep the rendered HTML
 * @param {Function} [options.onProgress]
 * @param {{warn: Function}} [options.log]
 * @param {AbortSignal} [options.signal]
 */
export async function capturePage({ page, dir, url, widths, noise = true, includeSource = false, onProgress = () => {}, log, signal }) {
  const started = Date.now()
  await ensureDir(dir)
  const documents = {}
  const limitations = []
  const failedAcc = []
  const responsesAcc = []
  const errors = []
  const unsubscribe = page.onEvent((event) => {
    const { method, params } = event
    if (method === 'Runtime.consoleAPICalled' && ['error', 'assert'].includes(params.type)) {
      const text = (params.args ?? [])
        .map((arg) => (typeof arg.value === 'string' ? arg.value : arg.description ?? arg.type ?? ''))
        .filter(Boolean)
        .join(' ')
        .slice(0, 300)
      if (text) errors.push(text)
    } else if (method === 'Runtime.exceptionThrown') {
      const details = params.exceptionDetails ?? {}
      const text = String(details.exception?.description ?? details.text ?? 'uncaught exception').split('\n')[0].slice(0, 300)
      if (text) errors.push(text)
    }
  })
  try {
    for (const width of widths) {
      throwIfAborted(signal)
      onProgress({ phase: 'capture', width, message: `捕获 ${width}px` })
      const document = await captureWidth({ page, dir, url, width, noise, includeSource, errors, limitations, log, signal })
      documents[String(width)] = document
      failedAcc.push(...(page.network.failed ?? []))
      responsesAcc.push(...(page.network.responses ?? []))
    }
  } finally {
    unsubscribe()
  }
  const health = {
    consoleErrors: [...new Set(errors)].slice(0, 40),
    pageErrors: [],
    failedRequests: dedupeRequests(failedAcc).slice(0, 40),
    requests: dedupeRequests(responsesAcc).slice(0, 200),
  }
  for (const width of widths) {
    const document = documents[String(width)]
    if (document) document.health = health
  }
  await writeJson(join(dir, 'page.json'), {
    schemaVersion: 1,
    url,
    capturedAt: nowIso(),
    widths,
    documents,
  })
  return { dir, documents, durationMs: Date.now() - started, limitations }
}

/** Capture one viewport width. */
async function captureWidth({ page, dir, url, width, noise, includeSource, errors, limitations, log, signal }) {
  const started = Date.now()
  const height = Math.max(480, Math.round((width * 9) / 16))
  await page.session.send('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: width < 768,
    screenWidth: width,
    screenHeight: height,
  })
  await page.session.send('Emulation.setTouchEmulationEnabled', { enabled: width < 768, maxTouchPoints: width < 768 ? 5 : 1 }).catch(() => {})
  await page.session.send('Emulation.setEmulatedMedia', {
    media: 'screen',
    features: [
      { name: 'prefers-color-scheme', value: 'light' },
      { name: 'prefers-reduced-motion', value: 'reduce' },
    ],
  }).catch(() => {})
  await page.session.send('Emulation.setScrollbarsHidden', { hidden: true }).catch(() => {})
  page.resetNetwork()

  const loaded = page.session.waitForEvent('Page.loadEventFired', { timeout: LIMITS.settleTimeoutMs }).catch(() => null)
  const navigation = await page.session.send('Page.navigate', { url })
  if (navigation?.errorText) throw new Error(`navigation to ${url} failed: ${navigation.errorText}`)
  await loaded
  await page.waitForNetworkIdle({ quietMs: LIMITS.networkQuietMs, timeoutMs: Math.min(15000, LIMITS.settleTimeoutMs) })

  // Warm lazy content: scroll the whole document, return to the top, wait for fonts.
  let measured = null
  try {
    const warm = await page.session.send('Runtime.evaluate', { expression: WARM_SCRIPT, awaitPromise: true, returnByValue: true })
    measured = warm?.result?.value ?? null
  } catch (error) {
    limitations.push(`at ${width} px the page could not be scrolled to warm lazy content: ${messageOf(error)}`)
  }
  await page.waitForNetworkIdle({ quietMs: LIMITS.networkQuietMs, timeoutMs: 6000 })
  try {
    await page.session.send('Runtime.evaluate', { expression: FREEZE_SCRIPT, returnByValue: true })
    await page.session.send('Runtime.evaluate', { expression: 'new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(true))))', awaitPromise: true, returnByValue: true })
  } catch {
    /* freezing is best effort */
  }

  const extracted = await page.session.send('Runtime.evaluate', { expression: EXTRACT_SCRIPT, returnByValue: true, awaitPromise: false })
  if (extracted?.exceptionDetails) {
    const details = extracted.exceptionDetails
    const reason = details.exception?.description ?? details.exception?.value ?? details.text ?? 'extraction failed'
    throw new Error(`the page could not be read at ${width} px: ${String(reason).split('\n')[0]}`)
  }
  const raw = extracted?.result?.value
  if (!raw || raw.ok !== true) throw new Error(`the page returned no readable structure at ${width} px`)

  const pageW = Math.max(width, Math.round(raw.page?.w ?? width))
  const pageH = Math.max(1, Math.round(raw.page?.h ?? height))
  const captureW = Math.min(LIMITS.maxPageWidth, Math.max(width, pageW))
  const captureH = Math.min(LIMITS.maxPageHeight, Math.max(height, pageH))
  if (pageH > captureH) limitations.push(`at ${width} px the page is ${pageH} px tall; only the first ${captureH} px were captured`)
  if (pageW > captureW) limitations.push(`at ${width} px the page is ${pageW} px wide; only the first ${captureW} px were captured`)

  const shot = await captureScreenshot(page, captureW, captureH, height, limitations, width)
  await writeFile(join(dir, `screenshot-${width}.png`), shot.data)
  const size = pngSize(shot.data) ?? { width: captureW, height: captureH }

  let noiseInfo = null
  if (noise) {
    try {
      await new Promise((resolve) => setTimeout(resolve, 650))
      const second = await captureScreenshot(page, captureW, captureH, height, [], width)
      const first = decodePng(shot.data)
      const after = decodePng(second.data)
      const mask = noiseMask(first, after, dynamicRects(raw), { threshold: 0.12, margin: DYNAMIC_MARGIN })
      await writeFile(join(dir, `noise-${width}.png`), mask.png)
      noiseInfo = { maskedPixels: mask.maskedPixels, maskedRatio: mask.maskedRatio, dynamicRects: mask.dynamicRects.length }
    } catch (error) {
      limitations.push(`at ${width} px the self-changing regions could not be measured: ${messageOf(error)}`)
    }
  }

  const design = computeDesign(raw)
  const layout = computeLayout(raw, width)
  const extras = compactExtras(raw)
  let html = undefined
  if (includeSource) {
    try {
      const source = await page.session.send('Runtime.evaluate', {
        expression: 'document.documentElement.outerHTML.slice(0, 2000000)',
        returnByValue: true,
      })
      html = typeof source?.result?.value === 'string' ? source.result.value : undefined
    } catch {
      limitations.push(`at ${width} px the rendered source could not be read in deep mode`)
    }
  }
  const document = {
    schemaVersion: 1,
    capturedAt: nowIso(),
    url: String(raw.url ?? url),
    title: String(raw.title ?? ''),
    lang: String(raw.lang ?? ''),
    width,
    viewportHeight: height,
    pageW: size.width,
    pageH: size.height,
    measuredPage: { w: pageW, h: pageH, elements: raw.page?.elements ?? 0 },
    dpr: 1,
    text: String(raw.text ?? ''),
    headings: Array.isArray(raw.headings) ? raw.headings.slice(0, 120) : [],
    links: Array.isArray(raw.links) ? raw.links.slice(0, LIMITS.maxLinks) : [],
    nodes: Array.isArray(raw.nodes) ? raw.nodes.slice(0, LIMITS.maxNodes) : [],
    outline: Array.isArray(raw.outline) ? raw.outline.slice(0, 600) : [],
    design,
    layouts: layout,
    ...extras,
    noise: noiseInfo,
    html,
    dynamicRects: dynamicRects(raw),
    durationMs: Date.now() - started,
  }
  return document
}

/** Take a full-page PNG, falling back to the viewport when Chrome refuses the size. */
async function captureScreenshot(page, width, height, viewportHeight, limitations, viewportWidth) {
  const params = {
    format: 'png',
    captureBeyondViewport: true,
    fromSurface: true,
    clip: { x: 0, y: 0, width, height, scale: 1 },
  }
  try {
    const shot = await page.session.send('Page.captureScreenshot', params)
    if (!shot?.data) throw new Error('the browser returned no image data')
    return { data: Buffer.from(shot.data, 'base64') }
  } catch (error) {
    if (limitations) limitations.push(`at ${viewportWidth} px the full-page screenshot failed (${messageOf(error)}); the visible area was captured instead`)
    const fallback = await page.session.send('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: false,
      fromSurface: true,
    })
    return { data: Buffer.from(fallback.data, 'base64') }
  }
}

/** Self-changing rectangles: media and embeds, in page coordinates. */
export function dynamicRects(raw) {
  const out = []
  for (const node of Array.isArray(raw?.nodes) ? raw.nodes : []) {
    if (!['video', 'canvas', 'iframe', 'embed', 'object', 'marquee'].includes(node.tag)) continue
    out.push({ x: node.styles.x, y: node.styles.y, w: node.styles.w, h: node.styles.h, tag: node.tag })
    if (out.length >= 60) break
  }
  return out
}

/** De-duplicate network rows by URL + status. */
function dedupeRequests(rows) {
  const seen = new Set()
  const out = []
  for (const row of Array.isArray(rows) ? rows : []) {
    const key = `${row.url}|${row.status ?? row.reason ?? ''}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(row)
  }
  return out
}

/** Write JSON with a trailing newline. */
async function writeJson(path, value) {
  await writeFile(path, JSON.stringify(value) + '\n', 'utf8')
}

/** Throw the abort reason when the signal fired. */
function throwIfAborted(signal) {
  if (signal?.aborted) {
    const error = new Error('capture cancelled')
    error.code = 'cancelled'
    throw error
  }
}

/**
 * Pick extra same-origin pages to study from the start page's links.
 * @param {object} captureDocument the start page's first-width document
 * @param {string} startUrl
 * @param {number} max
 */
export function pickRoutes(captureDocument, startUrl, max) {
  let start
  try {
    start = new URL(startUrl)
  } catch {
    return []
  }
  const norm = (path) => path.replace(/\/+$/u, '')
  const startPath = norm(start.pathname || '/')
  const routes = []
  const seen = new Set([startPath])
  for (const link of Array.isArray(captureDocument?.links) ? captureDocument.links : []) {
    if (routes.length >= max) break
    let parsed
    try {
      parsed = new URL(link.href)
    } catch {
      continue
    }
    if (parsed.origin !== start.origin) continue
    if (['#', 'mailto:', 'tel:', 'javascript:'].some((prefix) => link.href.startsWith(prefix))) continue
    const path = parsed.pathname || '/'
    const last = path.split('/').filter(Boolean).pop() ?? ''
    const looksLikeFile = /\.[a-z0-9]{2,5}$/iu.test(last) && !/\.html?$/iu.test(last)
    if (looksLikeFile) continue
    const key = norm(path)
    if (key === startPath || seen.has(key)) continue
    seen.add(key)
    const slug = (path.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/gu, '').toLowerCase() || 'page').slice(0, 48)
    routes.push({ path, slug, url: parsed.origin + path + parsed.search, title: String(link.text ?? '').slice(0, 80) })
  }
  return routes
}

/**
 * Capture a whole site: the start page plus up to `maxPages-1` same-origin
 * routes, each at every width. Files are written under `dir`.
 * @param {object} options
 * @param {import('./browser.js').BrowserPool} options.pool
 * @param {string} options.dir
 * @param {string} options.url
 * @param {number[]} options.widths
 * @param {number} [options.maxPages]
 * @param {boolean} [options.noise]
 * @param {boolean} [options.includeSource]
 * @param {Function} [options.onProgress]
 * @param {{warn: Function}} [options.log]
 * @param {AbortSignal} [options.signal]
 */
export async function captureSite({ pool, dir, url, widths, maxPages = 1, routes: explicitRoutes = null, noise = true, includeSource = false, onProgress = () => {}, log, signal }) {
  const started = Date.now()
  await ensureDir(dir)
  const limitations = []
  const pages = []
  await pool.withPage(async (page) => {
    onProgress({ phase: 'capture', message: `打开 ${url}` })
    const startCapture = await capturePage({ page, dir, url, widths, noise, includeSource, onProgress, log, signal })
    limitations.push(...startCapture.limitations)
    const startDoc = startCapture.documents[String(widths[0])]
    pages.push({ path: '', slug: '', url, title: startDoc?.title ?? '', dir: '', documents: startCapture.documents, durationMs: startCapture.durationMs })
    const routeCount = Math.max(0, Math.min(LIMITS.maxPages, Number(maxPages) || 1) - 1)
    let routes = []
    if (Array.isArray(explicitRoutes)) {
      routes = explicitRoutes
        .filter((route) => route && typeof route.path === 'string')
        .slice(0, LIMITS.maxPages)
        .map((route) => ({ path: route.path, slug: route.slug || route.path.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/gu, '') || 'page', url: route.url || new URL(route.path, url).href, title: route.title ?? '' }))
    } else if (routeCount > 0) {
      routes = pickRoutes(startDoc, url, routeCount)
    }
    if (routes.length > 0) {
      await writeFile(join(dir, 'routes.json'), JSON.stringify(routes, null, 2) + '\n', 'utf8')
      for (const route of routes) {
        throwIfAborted(signal)
        const routeDir = join(dir, 'routes', route.slug)
        await ensureDir(routeDir)
        try {
          onProgress({ phase: 'capture', message: `捕获子页 ${route.path}` })
          const capture = await capturePage({ page, dir: routeDir, url: route.url, widths, noise, includeSource, onProgress, log, signal })
          limitations.push(...capture.limitations)
          pages.push({ path: route.path, slug: route.slug, url: route.url, title: capture.documents[String(widths[0])]?.title ?? '', dir: `routes/${route.slug}`, documents: capture.documents, durationMs: capture.durationMs })
        } catch (error) {
          limitations.push(`the page ${route.path} could not be captured: ${messageOf(error)}`)
        }
      }
    }
  })
  return { dir, pages, durationMs: Date.now() - started, limitations, widths }
}

/** Merge one page's per-width documents into a compact layout row for the check. */
export function layoutsOf(page) {
  return Object.values(page.documents ?? {}).map((document) => ({
    width: document.width,
    pageW: document.layouts?.pageW ?? document.pageW,
    pageH: document.layouts?.pageH ?? document.pageH,
    type: document.layouts?.type ?? {},
    blocks: document.layouts?.blocks ?? [],
  }))
}

/** The page's noise mask path for a width (relative to its capture dir). */
export function noiseFileFor(width) {
  return `noise-${width}.png`
}

/** The page's screenshot path for a width (relative to its capture dir). */
export function screenshotFileFor(width) {
  return `screenshot-${width}.png`
}
