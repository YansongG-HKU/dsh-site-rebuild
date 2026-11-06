import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildBrief } from '../../lib/brief.js'
import { computeDesign, computeLayout } from '../../lib/tokens.js'

/** A synthetic capture document. */
function document(width = 1440) {
  const raw = {
    title: '青屿工作室',
    lang: 'zh',
    page: { w: 1440, h: 900, vw: 1440, vh: 900, dpr: 1, elements: 20, bodyBg: 'rgb(246, 241, 231)', bodyColor: 'rgb(32, 50, 60)', bodyFont: '"Segoe UI", sans-serif' },
    text: '青屿工作室 把想法注成形状 我们做品牌',
    headings: [{ tag: 'h1', text: '青屿工作室', size: 44 }],
    links: [{ href: 'https://x/work', text: '作品' }],
    nodes: [
      {
        depth: 0,
        path: 'body',
        tag: 'body',
        styles: { color: 'rgb(32, 50, 60)', bg: 'rgb(246, 241, 231)', bd: '', ff: '"Segoe UI", sans-serif', fs: 15, fw: '400', lh: 22, ls: 0, mt: 0, mr: 0, mb: 0, ml: 0, pt: 0, pr: 0, pb: 0, pl: 0, rad: 0, sh: '', gap: 0, gtc: '', bgi: '', x: 0, y: 0, w: 1440, h: 900 },
      },
    ],
    outline: [{ tag: 'header', role: 'banner', depth: 1, text: '' }, { tag: 'h1', role: 'heading', depth: 2, text: '青屿工作室' }],
    forms: [],
    assets: { images: [], stylesheets: ['https://x/a.css'], scripts: [], media: [], fonts: [] },
    a11y: { landmarks: { banner: 1 }, imagesWithoutAlt: 0, unnamedControls: 0 },
    css: { stylesheetCount: 1, inaccessibleStylesheets: 0, ruleCount: 10, mediaQueries: ['(max-width: 900px)'] },
    health: { consoleErrors: [], failedRequests: [], requests: [] },
    timing: { resourceCount: 1, transferBytes: 100 },
  }
  return { ...raw, width, layouts: computeLayout(raw, width), design: computeDesign(raw), css: { breakpoints: [{ width: 900, min: false, max: true }] }, pageHeight: 900 }
}

/** A synthetic project + capture. */
function project() {
  return {
    id: 'craft-test-abcdef',
    name: '青屿重建',
    target: { url: 'https://example.com/' },
    request: '复刻这个工作室首页',
    mode: 'clean',
    capture: { widths: [1440], limitations: ['cross-origin iframe not inspected'] },
  }
}

test('brief contains measured values, rules and acceptance criteria', () => {
  const brief = buildBrief({ project: project(), capture: { start: { path: '', dir: '', documents: { 1440: document(1440) } }, routes: [], widths: [1440] }, evidence: [{}, {}] })
  assert.ok(brief.bytes > 1000)
  assert.equal(brief.truncated, false)
  assert.match(brief.markdown, /# 建造简报/u)
  assert.match(brief.markdown, /净室/u)
  assert.match(brief.markdown, /#f6f1e7/u)
  assert.match(brief.markdown, /44px/u)
  assert.match(brief.markdown, /craft_check/u)
  assert.match(brief.markdown, /不要下载或复制/u)
  assert.match(brief.markdown, /证据：本次研究产生 2 条/u)
})

test('brief covers extra pages and a stack hint', () => {
  const withStack = project()
  withStack.stack = 'React + Vite'
  const brief = buildBrief({
    project: withStack,
    capture: {
      start: { path: '', dir: '', documents: { 1440: document(1440) } },
      routes: [{ path: '/work', dir: 'routes/work', documents: { 1440: document(1440) } }],
      widths: [1440],
    },
  })
  assert.match(brief.markdown, /React \+ Vite/u)
  assert.match(brief.markdown, /子页面/u)
  assert.match(brief.markdown, /\/work/u)
})
