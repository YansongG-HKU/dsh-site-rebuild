/**
 * dsh-site-rebuild — performance bench.
 *
 * Measures the two budgets that decide whether the plugin feels fast:
 *   1. the likeness engine on a real 1440×900 screenshot (decode + compare), and
 *   2. the capture engine against a local site (cold and warm browser reuse).
 *
 * Run: node test/perf/bench.mjs [--json]
 */

import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { performance } from 'node:perf_hooks'
import { BrowserPool, findBrowser } from '../../lib/browser.js'
import { captureSite } from '../../lib/capture.js'
import { compareViewport } from '../../lib/diff.js'
import { decodePng, encodePng } from '../../lib/png.js'
import { resolveConfig } from '../../lib/config.js'
import { startFixtureServer } from '../fixtures/server.mjs'

/** Deterministic pseudo-random RGBA image that compresses like a real page. */
function syntheticPage(width, height, seed = 1) {
  const rgba = new Uint8Array(width * height * 4)
  let state = seed
  const next = () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state
  }
  for (let y = 0; y < height; y += 1) {
    const band = Math.floor(y / 90) % 3
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4
      const noise = next() % 24
      rgba[i] = (band === 0 ? 240 : band === 1 ? 30 : 120) + noise
      rgba[i + 1] = (band === 0 ? 235 : band === 1 ? 60 : 160) + noise
      rgba[i + 2] = (band === 0 ? 225 : band === 1 ? 90 : 200) + noise
      rgba[i + 3] = 255
      if (x % 240 < 4) {
        rgba[i] = 250
        rgba[i + 1] = 210
        rgba[i + 2] = 120
      }
    }
  }
  return { width, height, rgba }
}

/** Time one async function in milliseconds. */
async function timed(fn) {
  const started = performance.now()
  const value = await fn()
  return { value, ms: Math.round((performance.now() - started) * 10) / 10 }
}

async function main() {
  const results = { engine: {}, capture: {}, environment: { node: process.version, browser: findBrowser('').path } }
  const width = 1440
  const height = 900

  // --- engine: decode + compare ---------------------------------------
  const pageA = syntheticPage(width, height, 7)
  const pageB = syntheticPage(width, height, 7)
  // Change a small region so the diff path does real work.
  for (let y = 100; y < 260; y += 1) {
    for (let x = 200; x < 460; x += 1) {
      const i = (y * width + x) * 4
      pageB.rgba[i] = 250
      pageB.rgba[i + 1] = 250
      pageB.rgba[i + 2] = 250
    }
  }
  const pngA = encodePng(pageA.rgba, width, height)
  const pngB = encodePng(pageB.rgba, width, height)
  results.engine.pngBytes = { original: pngA.length, changed: pngB.length }

  const decodeA = await timed(() => decodePng(pngA))
  const decodeB = await timed(() => decodePng(pngB))
  results.engine.decodeMs = { original: decodeA.ms, changed: decodeB.ms }

  // Warm the JIT, then measure the real comparison.
  compareViewport(decodeA.value, decodeB.value)
  const compare = await timed(() => compareViewport(decodeA.value, decodeB.value))
  results.engine.compareMs = compare.ms
  results.engine.compare = {
    score: compare.value.score,
    layout: compare.value.layout,
    detail: compare.value.detail,
    regions: compare.value.regions.length,
    bands: compare.value.bands,
    internalMs: compare.value.durationMs,
  }
  const identical = await timed(() => compareViewport(decodeA.value, decodeA.value))
  results.engine.identicalCompareMs = identical.ms

  // --- capture: local site, cold then warm ----------------------------
  const browser = findBrowser('')
  if (!browser.path) {
    results.capture.skipped = 'no Chrome or Edge found'
  } else {
    const fixture = await startFixtureServer()
    const dir = await mkdtemp(join(tmpdir(), 'site-bench-'))
    const log = { info: () => {}, warn: () => {} }
    const pool = new BrowserPool({ log })
    try {
      const widths = [1440, 768, 375]
      const cold = await timed(() => captureSite({ pool, dir: join(dir, 'cold'), url: fixture.url, widths, maxPages: 1, noise: true, log }))
      results.capture.coldMs = cold.ms
      results.capture.coldPages = cold.value.pages.length
      const warm = await timed(() => captureSite({ pool, dir: join(dir, 'warm'), url: fixture.url, widths, maxPages: 1, noise: true, log }))
      results.capture.warmMs = warm.ms
      results.capture.warmPerWidthMs = Math.round((warm.ms / widths.length) * 10) / 10
      // PNG decode of the real screenshots.
      const shot = await readFile(join(dir, 'warm', 'screenshot-1440.png'))
      const decoded = await timed(() => decodePng(shot))
      results.capture.decodeScreenshotMs = decoded.ms
      results.capture.screenshotBytes = shot.length
      results.capture.pageHeight = decoded.value.height
      // Compare the real original against itself (upper bound of the check cost per width).
      const real = await timed(() => compareViewport(decoded.value, decoded.value))
      results.capture.realCompareMs = real.ms
    } finally {
      await pool.dispose()
      await fixture.close()
      await rm(dir, { recursive: true, force: true })
    }
  }

  const budget = { compareUnder250ms: results.engine.compareMs < 250, warmCaptureUnder2sPerWidth: (results.capture.warmPerWidthMs ?? 0) < 2000 }
  results.budget = budget
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(results, null, 2))
  } else {
    console.log('dsh-site-rebuild bench')
    console.log('  node             ', results.environment.node)
    console.log('  browser          ', results.environment.browser)
    console.log('  decode 1440×900  ', results.engine.decodeMs.original + ' ms')
    console.log('  compare 1440×900 ', results.engine.compareMs + ' ms', `(score ${results.engine.compare.score}, ${results.engine.compare.regions} regions)`)
    console.log('  identical compare', results.engine.identicalCompareMs + ' ms')
    if (results.capture.skipped) {
      console.log('  capture          ', 'skipped —', results.capture.skipped)
    } else {
      console.log('  cold capture     ', results.capture.coldMs + ' ms', '(browser launch + 3 viewports)')
      console.log('  warm capture     ', results.capture.warmMs + ' ms', `(${results.capture.warmPerWidthMs} ms/viewport)`)
      console.log('  decode screenshot', results.capture.decodeScreenshotMs + ' ms', `(${results.capture.screenshotBytes} bytes, ${results.capture.pageHeight}px tall)`)
      console.log('  real compare     ', results.capture.realCompareMs + ' ms')
    }
    console.log('  budget           ', JSON.stringify(budget))
  }
  if (!budget.compareUnder250ms || ('warmMs' in results.capture && !budget.warmCaptureUnder2sPerWidth)) process.exitCode = 1
}

await main()
