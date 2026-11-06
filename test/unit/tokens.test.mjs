import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  captureReadme,
  computeBlocks,
  computeDesign,
  computeLayout,
  normalizeColor,
  parseBreakpoints,
  primaryFamily,
  summarizeCapture,
} from '../../lib/tokens.js'

/** A minimal raw extraction. */
function rawPage(overrides = {}) {
  return {
    title: '示例页',
    lang: 'zh',
    page: { w: 1440, h: 900, vw: 1440, vh: 900, dpr: 1, elements: 40, bodyBg: 'rgb(246, 241, 231)', bodyColor: 'rgb(32, 50, 60)', bodyFont: '"Segoe UI", sans-serif' },
    text: '标题 正文',
    headings: [{ tag: 'h1', text: '标题', size: 44 }, { tag: 'h2', text: '正文', size: 22 }],
    links: [{ href: 'https://x/', text: '首页' }],
    nodes: [
      {
        depth: 0,
        path: 'body',
        tag: 'body',
        id: '',
        classes: '',
        role: '',
        text: '',
        styles: { color: 'rgb(32, 50, 60)', bg: 'rgb(246, 241, 231)', bd: '', ff: '"Segoe UI", sans-serif', fs: 15, fw: '400', lh: 22, ls: 0, mt: 0, mr: 0, mb: 0, ml: 0, pt: 0, pr: 0, pb: 0, pl: 0, rad: 0, sh: '', gap: 0, gtc: '', fd: 'row', ta: 'left', pos: 'static', ovx: 'visible', bgi: '', x: 0, y: 0, w: 1440, h: 900 },
      },
      {
        depth: 1,
        path: 'body/0',
        tag: 'section',
        id: '',
        classes: 'hero',
        role: 'region',
        text: '',
        styles: { color: 'rgb(255, 255, 255)', bg: 'rgb(18, 59, 70)', bd: '', ff: '"Segoe UI", sans-serif', fs: 15, fw: '400', lh: 22, ls: 0, mt: 0, mr: 0, mb: 0, ml: 0, pt: 44, pr: 44, pb: 44, pl: 44, rad: 18, sh: '', gap: 30, gtc: '1.4fr 1fr', fd: 'row', ta: 'left', pos: 'static', ovx: 'visible', bgi: '', x: 0, y: 0, w: 1440, h: 400 },
      },
      {
        depth: 2,
        path: 'body/0/0',
        tag: 'h2',
        id: '',
        classes: '',
        role: '',
        text: '标题',
        styles: { color: 'rgb(255, 212, 121)', bg: 'rgba(0, 0, 0, 0)', bd: '', ff: '"Segoe UI", sans-serif', fs: 34, fw: '700', lh: 40, ls: 0, mt: 0, mr: 0, mb: 12, ml: 0, pt: 0, pr: 0, pb: 0, pl: 0, rad: 0, sh: '', gap: 0, gtc: '', fd: 'row', ta: 'left', pos: 'static', ovx: 'visible', bgi: '', x: 44, y: 44, w: 500, h: 40 },
      },
      {
        depth: 2,
        path: 'body/0/1',
        tag: 'div',
        id: '',
        classes: '',
        role: '',
        text: '正文',
        styles: { color: 'rgb(255, 255, 255)', bg: 'rgba(0, 0, 0, 0)', bd: '', ff: '"Segoe UI", sans-serif', fs: 15, fw: '400', lh: 22, ls: 0, mt: 0, mr: 0, mb: 0, ml: 0, pt: 0, pr: 0, pb: 0, pl: 0, rad: 0, sh: '', gap: 0, gtc: '', fd: 'row', ta: 'left', pos: 'static', ovx: 'visible', bgi: '', x: 44, y: 50, w: 400, h: 40 },
      },
    ],
    outline: [{ tag: 'header', role: 'banner', depth: 1, text: '' }, { tag: 'h1', role: 'heading', depth: 2, text: '标题' }, { tag: 'footer', role: 'contentinfo', depth: 1, text: '' }],
    forms: [],
    images: [],
    assets: { images: ['https://x/a.png'], stylesheets: ['https://x/a.css'], scripts: ['https://x/a.js'], media: [], fonts: ['Segoe UI'] },
    a11y: { landmarks: { banner: 1, contentinfo: 1 }, imagesWithoutAlt: 0, unnamedControls: 0 },
    css: { stylesheetCount: 1, inaccessibleStylesheets: 0, ruleCount: 12, mediaQueries: ['(max-width: 900px)', '(max-width: 520px)'] },
    dynamic: { animatedElements: 0 },
    health: { consoleErrors: [], failedRequests: [], requests: [] },
    timing: { resourceCount: 3, transferBytes: 1000 },
    ...overrides,
  }
}

test('normalizeColor parses the browser colour forms', () => {
  assert.deepEqual(normalizeColor('rgb(255, 255, 255)'), { hex: '#ffffff', alpha: 1 })
  assert.deepEqual(normalizeColor('rgba(10, 20, 30, 0.5)'), { hex: '#0a141e', alpha: 0.5 })
  assert.deepEqual(normalizeColor('#abc'), { hex: '#aabbcc', alpha: 1 })
  assert.deepEqual(normalizeColor('#11223344'), { hex: '#112233', alpha: 68 / 255 })
  assert.equal(normalizeColor('transparent'), null)
  assert.equal(normalizeColor('rgba(0, 0, 0, 0)'), null)
  assert.equal(normalizeColor('nonsense'), null)
  assert.equal(primaryFamily('"__Figtree_a1b2c3", sans-serif'), 'Figtree')
})

test('parseBreakpoints extracts unique media widths', () => {
  const breakpoints = parseBreakpoints(['(min-width: 768px)', '(max-width: 900px)', '(max-width: 900px)', 'print', '(min-width: 1200px) and (max-width: 1400px)'])
  assert.deepEqual(breakpoints.map((bp) => bp.width), [768, 900, 1200, 1400])
  assert.equal(breakpoints[0].min, true)
  assert.equal(breakpoints[1].max, true)
})

test('computeDesign aggregates colours, fonts and spacing', () => {
  const design = computeDesign(rawPage())
  assert.equal(design.backgrounds[0].value, '#f6f1e7')
  assert.ok(design.backgrounds.some((entry) => entry.value === '#123b46'))
  assert.ok(design.fonts.some((entry) => entry.value === 'Segoe UI'))
  assert.ok(design.fontSizes.some((entry) => entry.value === '15'))
  assert.ok(design.spacing.some((entry) => entry.value === '44'))
  assert.equal(design.body.background, '#f6f1e7')
})

test('computeBlocks measures padding, per-row and column', () => {
  const blocks = computeBlocks(rawPage())
  const hero = blocks.find((block) => block.tag === 'section')
  assert.ok(hero)
  assert.deepEqual(hero.pad, [44, 44, 44, 44])
  assert.equal(hero.heading, '标题')
  assert.equal(hero.perRow, 2)
  assert.equal(hero.column, 500)
})

test('computeLayout reports the per-width measurements', () => {
  const layout = computeLayout(rawPage(), 1440)
  assert.equal(layout.width, 1440)
  assert.equal(layout.pageW, 1440)
  assert.equal(layout.type.h1, 44)
  assert.equal(layout.type.h2, 22)
  assert.equal(layout.blocks.length >= 2, true)
})

test('summarizeCapture merges per-width documents', () => {
  const pages = [
    {
      path: '',
      dir: '',
      url: 'https://x/',
      documents: {
        1440: { ...rawPage(), width: 1440, layouts: computeLayout(rawPage(), 1440), design: computeDesign(rawPage()), css: { breakpoints: [{ width: 900 }, { width: 520 }] } },
        375: { ...rawPage({ page: { ...rawPage().page, w: 375, h: 1200 } }), width: 375, layouts: computeLayout(rawPage(), 375), design: computeDesign(rawPage()), css: { breakpoints: [{ width: 900 }, { width: 520 }] } },
      },
    },
  ]
  const summary = summarizeCapture(pages, { durationMs: 1234, widths: [1440, 375] })
  assert.deepEqual(summary.widths, [1440, 375])
  assert.equal(summary.pages.length, 1)
  assert.equal(summary.pages[0].widthData.length, 2)
  assert.deepEqual(summary.breakpoints, [520, 900])
  assert.equal(summary.durationMs, 1234)
  assert.equal(summary.start.title, '示例页')
})

test('captureReadme describes the target in markdown', () => {
  const pages = [
    {
      path: '',
      dir: '',
      documents: {
        1440: { ...rawPage(), width: 1440, layouts: computeLayout(rawPage(), 1440), design: computeDesign(rawPage()), css: { breakpoints: parseBreakpoints(rawPage().css.mediaQueries) }, a11y: rawPage().a11y, health: rawPage().health, timing: rawPage().timing },
      },
    },
  ]
  const project = {
    name: '示例项目',
    target: { url: 'https://x/' },
    request: '复刻',
    mode: 'clean',
    capture: { studiedAt: '2026-01-01T00:00:00.000Z', widths: [1440], pages: [{ path: '', dir: '', title: '示例页', elements: 40, widthData: [{ width: 1440, pageW: 1440, pageH: 900, type: { h1: 44 } }] }] },
  }
  const readme = captureReadme(project, pages)
  assert.match(readme, /# 捕获说明 · 示例项目/u)
  assert.match(readme, /#f6f1e7/u)
  assert.match(readme, /520px/u)
  assert.match(readme, /局限/u)
})
