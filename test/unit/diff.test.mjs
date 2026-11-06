import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  aggregateScore,
  buildClaims,
  combineScores,
  compareViewport,
  designNotes,
  gradeForScore,
  healthNotes,
  noiseMask,
  structureLikeness,
  textLikeness,
  tokenSimilarity,
  wordCounts,
} from '../../lib/diff.js'
import { decodePng, encodePng } from '../../lib/png.js'

/** A solid-colour RGBA image. */
function solid(width, height, [r, g, b, a = 255]) {
  const rgba = new Uint8Array(width * height * 4)
  for (let i = 0; i < rgba.length; i += 4) {
    rgba[i] = r
    rgba[i + 1] = g
    rgba[i + 2] = b
    rgba[i + 3] = a
  }
  return { width, height, rgba }
}

/** A capture document with the fields the comparisons read. */
function capture(overrides = {}) {
  return {
    width: 1440,
    text: '把想法注成形状 我们做品牌 做界面 也做装置',
    headings: [{ tag: 'h1', text: '青屿工作室' }, { tag: 'h2', text: '品牌' }],
    outline: [
      { tag: 'header', role: 'banner' },
      { tag: 'h1', role: 'heading' },
      { tag: 'nav', role: 'navigation' },
      { tag: 'main', role: 'main' },
      { tag: 'section', role: 'region' },
      { tag: 'footer', role: 'contentinfo' },
    ],
    layouts: { width: 1440, pageW: 1440, pageH: 900, type: { h1: 44, h2: 22, body: 15 }, blocks: [{ tag: 'section', heading: '品牌', pad: [22, 22, 22, 22], perRow: 3, column: 340 }] },
    design: {
      backgrounds: [{ value: '#ffffff', count: 6 }, { value: '#0f6b5c', count: 2 }],
      textColors: [{ value: '#20323c', count: 9 }],
      fonts: [{ value: 'Segoe UI', count: 20 }],
      fontSizes: [{ value: '15', count: 8 }, { value: '44', count: 1 }],
      fontWeights: [{ value: '400', count: 12 }],
      lineHeights: [{ value: '22', count: 8 }],
      spacing: [{ value: '22', count: 6 }],
      radii: [{ value: '14', count: 3 }],
      shadows: [],
      customProperties: {},
    },
    css: { stylesheetCount: 1, inaccessibleStylesheets: 0, ruleCount: 40, breakpoints: [{ width: 900, min: false, max: true, queries: [] }], customProperties: {} },
    health: { consoleErrors: [], failedRequests: [], requests: [{ url: 'http://x/', status: 200 }] },
    a11y: { landmarks: { banner: 1, main: 1, contentinfo: 1 }, imagesWithoutAlt: 0, unnamedControls: 0 },
    assets: { images: [], stylesheets: [], scripts: [], media: [], fonts: [] },
    ...overrides,
  }
}

test('identical images score 100 on every image metric', () => {
  const image = solid(320, 200, [240, 235, 225])
  const result = compareViewport(image, image)
  assert.equal(result.score, 100)
  assert.equal(result.layout, 100)
  assert.equal(result.detail, 100)
  assert.equal(result.pixel.diffPixels, 0)
  assert.equal(result.pixel.ratio, 0)
})

test('a large colour change lowers layout/detail and reports regions', () => {
  const before = solid(320, 200, [246, 241, 231])
  const after = solid(320, 200, [150, 30, 30])
  const result = compareViewport(before, after)
  assert.ok(result.layout < 60, `layout ${result.layout}`)
  assert.ok(result.detail < 80, `detail ${result.detail}`)
  assert.ok(result.regions.length > 0)
  assert.ok(result.score < 70)
})

test('noise masks neutralise regions that change by themselves', () => {
  const before = solid(320, 200, [255, 255, 255])
  const after = solid(320, 200, [255, 255, 255])
  // One 100×100 region of the "page" changes between the two captures.
  for (let y = 40; y < 140; y += 1) {
    for (let x = 40; x < 140; x += 1) {
      const i = (y * 320 + x) * 4
      after.rgba[i] = 0
      after.rgba[i + 1] = 0
      after.rgba[i + 2] = 0
    }
  }
  const unmasked = compareViewport(before, after)
  assert.ok(unmasked.score < 100, 'without a mask the change is penalised')
  const mask = noiseMask(before, after, [], { threshold: 0.1 })
  const maskImage = decodePng(mask.png)
  const masked = compareViewport(before, after, { maskOriginal: maskImage, maskBuilt: maskImage })
  assert.ok(masked.score > unmasked.score, `masked ${masked.score} > unmasked ${unmasked.score}`)
  assert.ok(masked.score > 95, `masked score ${masked.score}`)
  assert.ok(mask.maskedPixels > 5000)
})

test('page height differences are penalised', () => {
  const short = solid(320, 200, [255, 255, 255])
  const tall = solid(320, 400, [255, 255, 255])
  const result = compareViewport(short, tall)
  assert.ok(result.heightRatio < 1)
  assert.ok(result.score < 100)
})

test('diff image round-trips through the PNG codec', () => {
  const a = solid(32, 16, [10, 20, 30])
  const b = solid(32, 16, [10, 20, 30])
  for (let x = 0; x < 10; x += 1) {
    const i = (6 * 32 + x) * 4
    b.rgba[i] = 250
  }
  const comparison = compareViewport(a, b)
  assert.ok(comparison.pixel.diffPixels > 0)
  const decoded = decodePng(encodePng(a.rgba, a.width, a.height))
  assert.equal(decoded.width, 32)
})

test('text likeness is a Dice overlap with missing headings and words', () => {
  const original = capture()
  const built = capture({ text: '把想法注成形状 我们做品牌 做界面', headings: [{ tag: 'h1', text: '青屿工作室' }] })
  const likeness = textLikeness(original, built)
  assert.ok(likeness.similarity > 60 && likeness.similarity < 100, `similarity ${likeness.similarity}`)
  assert.ok(likeness.missingHeadings.includes('品牌'))
  assert.ok(likeness.missingWords.includes('装置'))
  assert.equal(textLikeness({ text: '' }, built), null)
  assert.equal(wordCounts('a bb cc bb').get('bb'), 2)
})

test('structure likeness uses the outline in order', () => {
  const original = capture()
  const built = capture({ outline: original.outline.slice(0, 3) })
  const likeness = structureLikeness(original, built)
  assert.ok(likeness.similarity > 40 && likeness.similarity < 100)
  assert.ok(likeness.missing.length > 0)
  assert.equal(structureLikeness({ outline: [] }, built), null)
})

test('design notes name missing colours, fonts and block differences', () => {
  const original = capture()
  const built = capture({
    design: {
      ...capture().design,
      backgrounds: [{ value: '#ffffff', count: 6 }],
      fonts: [{ value: 'Arial', count: 20 }],
      fontSizes: [{ value: '15', count: 8 }],
    },
    layouts: { ...capture().layouts, blocks: [{ tag: 'section', heading: '品牌', pad: [8, 8, 8, 8], perRow: 2, column: 300 }] },
  })
  const notes = designNotes(original, built)
  const joined = notes.join('\n')
  assert.match(joined, /#0f6b5c/u)
  assert.match(joined, /Arial/u)
  assert.match(joined, /padding|per row|content column/u)
})

test('health notes ignore favicon noise but catch new errors', () => {
  const original = capture()
  const built = capture({
    health: {
      consoleErrors: ['boom'],
      failedRequests: [{ url: 'http://x/favicon.ico', status: 404 }, { url: 'http://x/app.js', status: 404 }],
      requests: [],
    },
  })
  const notes = healthNotes(original, built)
  const joined = notes.join('\n')
  assert.match(joined, /error\(s\)/u)
  assert.match(joined, /\/app\.js/u)
  assert.ok(!/favicon/u.test(joined))
})

test('claims fail only where the build is worse', () => {
  const original = capture()
  const built = capture({
    layouts: { ...capture().layouts, pageW: 1600 },
    health: { consoleErrors: ['x'], failedRequests: [], requests: [] },
    a11y: { landmarks: { banner: 1 }, imagesWithoutAlt: 0, unnamedControls: 0 },
  })
  const claims = buildClaims(original, built)
  assert.ok(claims.some((claim) => claim.title.includes('sideways') && claim.passed === false))
  assert.ok(claims.some((claim) => claim.title.includes('landmarks') && claim.passed === false))
})

test('token similarity and combined score', () => {
  const original = capture()
  const same = tokenSimilarity(original, capture())
  assert.ok(same.score > 99)
  const changed = tokenSimilarity(original, capture({ design: { ...capture().design, backgrounds: [{ value: '#000000', count: 6 }], fonts: [{ value: 'Arial', count: 20 }], fontSizes: [{ value: '12', count: 8 }] } }))
  assert.ok(changed.score < same.score)
  assert.equal(combineScores({ layout: 100, detail: 100, tokens: 100, heightRatio: 1 }), 100)
  assert.ok(combineScores({ layout: 50, detail: 50, tokens: 50, heightRatio: 0.8 }) < 55)
  assert.equal(gradeForScore(100), 'S')
  assert.equal(gradeForScore(50), 'D')
  assert.equal(aggregateScore([{ width: 1440, score: 90 }, { width: 768, score: 80 }], { 1440: 0.5, 768: 0.5 }), 85)
})
