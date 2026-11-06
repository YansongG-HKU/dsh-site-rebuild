import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import { BrowserPool, findBrowser } from '../../lib/browser.js'
import { resolveConfig } from '../../lib/config.js'
import { createService } from '../../lib/service.js'
import { createStore } from '../../lib/store.js'
import { pngSize } from '../../lib/png.js'
import { startFixtureServer } from '../fixtures/server.mjs'

const SITE_DIR = fileURLToPath(new URL('../fixtures/site/', import.meta.url))

/** Copy a small fixture directory recursively. */
async function copyDir(from, to) {
  for (const entry of await readdir(from, { withFileTypes: true })) {
    const source = join(from, entry.name)
    const target = join(to, entry.name)
    if (entry.isDirectory()) {
      await mkdir(target, { recursive: true })
      await copyDir(source, target)
    } else {
      await writeFile(target, await readFile(source))
    }
  }
}

/** Poll the service's job runner until the job settles. */
function waitJob(service, jobId, timeoutMs = 180000) {
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
        reject(new Error(`job ${jobId} ${job.status}: ${job.error}`))
        return
      }
      if (Date.now() - started > timeoutMs) {
        clearInterval(timer)
        reject(new Error(`job ${jobId} timed out`))
      }
    }, 200)
    if (typeof timer.unref === 'function') timer.unref()
  })
}

test('study → brief → check → refine against a real local site', { timeout: 300000 }, async (t) => {
  const browser = findBrowser('')
  if (!browser.path) {
    t.skip('no Chrome or Edge executable found')
    return
  }
  const fixture = await startFixtureServer()
  const dataDir = await mkdtemp(join(tmpdir(), 'craft-integration-'))
  const log = { info: () => {}, warn: (message) => console.log('[warn]', message) }
  const store = await createStore({ dir: dataDir, log }).init()
  const pool = new BrowserPool({ log })
  const config = resolveConfig({ widths: [1440, 768, 375], maxPages: 2 })
  const service = createService({ store, pool, config, log })
  try {
    // --- study ---------------------------------------------------------
    const project = await service.createProject({ url: fixture.url, request: '复刻这个工作室首页，保留布局与配色', mode: 'clean', name: '集成测试' })
    assert.match(project.id, /^craft-/u)
    const studyStarted = Date.now()
    const study = await waitJob(service, service.startStudy(project.id).id)
    const studyMs = Date.now() - studyStarted
    assert.equal(study.result.pages, 2, 'start page + one same-origin route')
    assert.deepEqual(study.result.widths, [1440, 768, 375])
    assert.ok(study.result.evidenceCount >= 10, `evidence ${study.result.evidenceCount}`)

    const paths = store.paths(project.id)
    const pageJson = JSON.parse(await readFile(join(paths.capture, 'page.json'), 'utf8'))
    for (const width of [1440, 768, 375]) {
      const document = pageJson.documents[String(width)]
      assert.ok(document, `capture at ${width}px`)
      assert.equal(document.width, width)
      assert.ok(document.layouts.pageH > 600, `page height at ${width}px`)
      assert.ok(document.nodes.length > 5)
      assert.ok(document.design.backgrounds.some((entry) => entry.value === '#0f6b5c'), 'brand colour extracted')
      const image = await readFile(join(paths.capture, `screenshot-${width}.png`))
      const size = pngSize(image)
      assert.equal(size.width, Math.min(1440, Math.max(width, document.pageW)))
      assert.ok(size.height >= 480)
      const noise = await readFile(join(paths.capture, `noise-${width}.png`))
      assert.ok(pngSize(noise).height > 0, 'noise mask written')
      assert.ok(document.noise, 'noise metadata kept')
    }
    const breakpoints = pageJson.documents['1440'].css.breakpoints.map((bp) => bp.width)
    assert.ok(breakpoints.includes(520) && breakpoints.includes(900), `breakpoints ${breakpoints}`)
    assert.ok(pageJson.documents['1440'].noise.maskedPixels > 0, 'the clock region is masked as self-changing')

    const routeDir = join(paths.capture, 'routes', 'work')
    const routePage = JSON.parse(await readFile(join(routeDir, 'page.json'), 'utf8'))
    assert.ok(routePage.documents['1440'].title.includes('作品'))

    const evidence = JSON.parse(await readFile(join(paths.capture, 'evidence.json'), 'utf8'))
    const kinds = new Set(evidence.map((record) => record.kind))
    for (const kind of ['target', 'design-tokens', 'layout', 'content', 'assets', 'responsive', 'health', 'a11y', 'dynamic', 'page']) {
      assert.ok(kinds.has(kind), `evidence kind ${kind}`)
    }
    assert.ok(evidence.every((record) => typeof record.confidence === 'number' && record.confidence > 0))
    const readme = await readFile(join(paths.capture, 'README.md'), 'utf8')
    assert.match(readme, /#f6f1e7/u)
    assert.match(readme, /520px/u)

    // --- brief ---------------------------------------------------------
    const brief = await service.brief(project.id)
    assert.ok(brief.bytes > 2000, `brief bytes ${brief.bytes}`)
    assert.match(brief.markdown, /净室/u)
    assert.match(brief.markdown, /#0f6b5c/u)
    assert.match(brief.markdown, /44px/u)
    assert.match(brief.markdown, /craft_check/u)
    assert.match(brief.markdown, /\/work/u)
    assert.ok((await stat(join(paths.capture, 'BRIEF.md'))).size > 1000)

    // --- identical rebuild: score should be ~100 -----------------------
    await copyDir(SITE_DIR, paths.app)
    assert.ok((await stat(join(paths.app, 'index.html'))).isFile())
    const checkStarted = Date.now()
    const check = await waitJob(service, service.startCheck(project.id, {}).id)
    const checkMs = Date.now() - checkStarted
    assert.ok(check.result.score >= 97, `identical clone scored ${check.result.score}`)
    assert.equal(check.result.grade, 'S')
    assert.deepEqual(check.result.unknowns, [])
    const failed = (check.result.claims ?? []).filter((claim) => !claim.passed)
    assert.deepEqual(failed, [], `failed claims: ${JSON.stringify(failed)}`)
    assert.ok(check.result.perPage.every((page) => page.perWidth.length === 3))
    assert.ok((await stat(join(paths.checks, 'round-1', 'check.json'))).isFile())

    // --- degraded rebuild: score must drop -----------------------------
    const styles = await readFile(join(paths.app, 'styles.css'), 'utf8')
    await writeFile(
      join(paths.app, 'styles.css'),
      styles
        .replace('--brand: #0f6b5c', '--brand: #a33327')
        .replace('--paper: #f6f1e7', '--paper: #dde7ff')
        .replace('font-family: "Segoe UI", "Noto Sans SC", system-ui, sans-serif;', 'font-family: Georgia, "Songti SC", serif;'),
    )
    const indexHtml = await readFile(join(paths.app, 'index.html'), 'utf8')
    await writeFile(join(paths.app, 'index.html'), indexHtml.replace(/<section class="showcase">[\s\S]*?<\/section>/u, '').replace(/<section class="hero">[\s\S]*?<\/section>/u, ''))
    const check2 = await waitJob(service, service.startCheck(project.id, {}).id)
    console.log(`[integration] identical ${check.result.score} · degraded ${check2.result.score} · per width ${JSON.stringify(check2.result.perPage.map((page) => page.perWidth.map((row) => row.width + ':' + row.score)))}`)
    assert.ok(check2.result.score < check.result.score - 5, `degraded ${check2.result.score} vs ${check.result.score}`)
    assert.ok(check2.result.score < 90, `degraded score ${check2.result.score}`)
    const failed2 = (check2.result.claims ?? []).filter((claim) => !claim.passed)
    assert.ok(failed2.length > 0 || check2.result.notes.length > 0)

    // --- durable state --------------------------------------------------
    const after = await store.get(project.id)
    assert.equal(after.steps.study.state, 'done')
    assert.equal(after.steps.check.state, 'done')
    assert.equal(after.checks.length, 2)
    assert.ok(after.bestScore >= 97)
    assert.ok(['checked', 'ready'].includes(after.status), `status ${after.status}`)
    const evidencePage = await service.evidence(project.id, { limit: 3 })
    assert.equal(evidencePage.records.length, 3)
    assert.ok(evidencePage.total >= 10)

    // --- preview --------------------------------------------------------
    const preview = await service.preview(project.id)
    assert.match(preview.url, /^http:\/\/127\.0\.0\.1:\d+\/$/u)
    const response = await fetch(preview.url)
    assert.equal(response.status, 200)
    const html = await response.text()
    assert.match(html, /青屿工作室/u)

    console.log(`[integration] study ${studyMs} ms · check ${checkMs} ms · identical ${check.result.score} · degraded ${check2.result.score}`)
  } finally {
    await service.dispose()
    await pool.dispose()
    await fixture.close()
    await rm(dataDir, { recursive: true, force: true })
  }
})
