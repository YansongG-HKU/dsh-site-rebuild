/**
 * dsh-site-rebuild — likeness engine.
 *
 * Two layers:
 *   1. Image comparison (pure, typed arrays): banded layout similarity (tile
 *      colours), perceptual similarity (block SSIM of luminance), pixel diff
 *      for the visual report, and the top mismatching regions that drive the
 *      fix list. Banding keeps very tall pages honest instead of squashing them
 *      into one thumbnail.
 *   2. Capture-document comparison: visible text (Dice over words), page
 *      structure (LCS over landmarks/headings/controls), measured design values
 *      (colours, fonts, sizes, spacing, block padding/columns) and health
 *      regressions. These do not change the score; they tell a builder what to
 *      fix.
 *
 * The score is 0–100 per width: 50% layout + 50% perceptual detail, with a
 * page-height penalty. Noise masks (regions the original changes by itself)
 * are neutralised in both and excluded from the pixel diff.
 */

import { clamp } from './util.js'
import { encodePng } from './png.js'

/** Default perceptual threshold (0.1 matches the classic YIQ pixel-diff scale). */
export const DEFAULT_PIXEL_THRESHOLD = 0.1
/** Tiles per band used by the layout similarity. */
const TILES_X = 12
const TILES_Y = 8
/** Band height in CSS px (roughly one desktop viewport). */
const BAND_HEIGHT = 900
/** Width of a band's comparison canvas. */
const BAND_WIDTH = 320

// ---------------------------------------------------------------------------
// Image comparison
// ---------------------------------------------------------------------------

/** Crop a region out of an RGBA image into a new Uint8Array. */
export function cropRgba(image, x, y, width, height) {
  const out = new Uint8Array(width * height * 4)
  const sx = clamp(x, 0, image.width, 0)
  const sy = clamp(y, 0, image.height, 0)
  const w = clamp(width, 0, image.width - sx, 0)
  const h = clamp(height, 0, image.height - sy, 0)
  for (let row = 0; row < h; row += 1) {
    const from = ((sy + row) * image.width + sx) * 4
    out.set(image.rgba.subarray(from, from + w * 4), row * width * 4)
  }
  return out
}

/**
 * Downscale to `dw×dh` with a 2×2 sample of each destination cell's middle half
 * (fast, and visually faithful at thumbnail scale; area-averaging every source
 * pixel is 4-8× slower for no measurable metric gain). When `mask` is supplied
 * (white = ignore), a destination pixel covered mostly by masked samples is
 * flagged in `masked` so comparisons can neutralise it in both images.
 * @returns {{rgba: Uint8Array, masked: Uint8Array}}
 */
export function downscaleRgba(image, dw, dh, mask = null) {
  const sw = image.width
  const sh = image.height
  const rgba = new Uint8Array(dw * dh * 4)
  const masked = new Uint8Array(dw * dh)
  if (sw === 0 || sh === 0 || dw === 0 || dh === 0) return { rgba, masked }
  const xScale = sw / dw
  const yScale = sh / dh
  for (let dy = 0; dy < dh; dy += 1) {
    const sy0 = dy * yScale
    const sampleY = [Math.min(sh - 1, Math.floor(sy0 + yScale * 0.25)), Math.min(sh - 1, Math.floor(sy0 + yScale * 0.75))]
    for (let dx = 0; dx < dw; dx += 1) {
      const sx0 = dx * xScale
      const sampleX = [Math.min(sw - 1, Math.floor(sx0 + xScale * 0.25)), Math.min(sw - 1, Math.floor(sx0 + xScale * 0.75))]
      let r = 0
      let g = 0
      let b = 0
      let alpha = 0
      let count = 0
      let maskedCount = 0
      for (let iy = 0; iy < 2; iy += 1) {
        const sy = sampleY[iy]
        for (let ix = 0; ix < 2; ix += 1) {
          const index = (sy * sw + sampleX[ix]) * 4
          if (mask !== null && mask.rgba !== undefined && mask.rgba[index] > 200) {
            maskedCount += 1
            continue
          }
          r += image.rgba[index]
          g += image.rgba[index + 1]
          b += image.rgba[index + 2]
          alpha += image.rgba[index + 3]
          count += 1
        }
      }
      const o = (dy * dw + dx) * 4
      if (count === 0) {
        // Fully masked destination pixel: neutral grey in both images.
        rgba[o] = 128
        rgba[o + 1] = 128
        rgba[o + 2] = 128
        rgba[o + 3] = 255
        masked[dy * dw + dx] = 1
        continue
      }
      rgba[o] = Math.round(r / count)
      rgba[o + 1] = Math.round(g / count)
      rgba[o + 2] = Math.round(b / count)
      rgba[o + 3] = Math.round(alpha / count)
      if (maskedCount >= 2) masked[dy * dw + dx] = 1
    }
  }
  return { rgba, masked }
}

/** Mean colour of one tile in an RGBA canvas. */
function tileMean(rgba, width, x0, y0, x1, y1) {
  let r = 0
  let g = 0
  let b = 0
  let count = 0
  for (let y = y0; y < y1; y += 1) {
    let index = (y * width + x0) * 4
    for (let x = x0; x < x1; x += 1, index += 4) {
      r += rgba[index]
      g += rgba[index + 1]
      b += rgba[index + 2]
      count += 1
    }
  }
  return count === 0 ? [0, 0, 0] : [r / count, g / count, b / count]
}

/** Layout similarity of two same-size RGBA canvases, 0..100. */
function tileSimilarity(rgbaA, rgbaB, width, height, masked) {
  let sum = 0
  let count = 0
  for (let ty = 0; ty < TILES_Y; ty += 1) {
    const y0 = Math.floor((ty * height) / TILES_Y)
    const y1 = Math.max(y0 + 1, Math.floor(((ty + 1) * height) / TILES_Y))
    for (let tx = 0; tx < TILES_X; tx += 1) {
      const x0 = Math.floor((tx * width) / TILES_X)
      const x1 = Math.max(x0 + 1, Math.floor(((tx + 1) * width) / TILES_X))
      if (masked !== null) {
        let covered = 0
        let total = 0
        for (let y = y0; y < y1; y += 1) {
          for (let x = x0; x < x1; x += 1) {
            total += 1
            covered += masked[y * width + x]
          }
        }
        if (total > 0 && covered / total >= 0.6) continue
      }
      const a = tileMean(rgbaA, width, x0, y0, x1, y1)
      const b = tileMean(rgbaB, width, x0, y0, x1, y1)
      const delta = Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2) / 441.6729559300637
      sum += 1 - Math.min(1, delta)
      count += 1
    }
  }
  return count === 0 ? 0 : (sum / count) * 100
}

/** Luminance plane from RGBA (reused by SSIM). */
function lumaPlane(rgba, width, height) {
  const luma = new Float32Array(width * height)
  for (let i = 0, o = 0; i < rgba.length; i += 4, o += 1) {
    luma[o] = 0.299 * rgba[i] + 0.587 * rgba[i + 1] + 0.114 * rgba[i + 2]
  }
  return luma
}

/** Block-wise SSIM of two luminance planes (8×8 blocks), 0..100. */
function blockSsim(lumaA, lumaB, width, height) {
  const block = 8
  const C1 = (0.01 * 255) ** 2
  const C2 = (0.03 * 255) ** 2
  let total = 0
  let count = 0
  for (let y = 0; y + block <= height; y += block) {
    for (let x = 0; x + block <= width; x += block) {
      let sumA = 0
      let sumB = 0
      let sumAA = 0
      let sumBB = 0
      let sumAB = 0
      for (let dy = 0; dy < block; dy += 1) {
        let index = (y + dy) * width + x
        for (let dx = 0; dx < block; dx += 1, index += 1) {
          const a = lumaA[index]
          const b = lumaB[index]
          sumA += a
          sumB += b
          sumAA += a * a
          sumBB += b * b
          sumAB += a * b
        }
      }
      const n = block * block
      const meanA = sumA / n
      const meanB = sumB / n
      const varA = sumAA / n - meanA * meanA
      const varB = sumBB / n - meanB * meanB
      const cov = sumAB / n - meanA * meanB
      const numerator = (2 * meanA * meanB + C1) * (2 * cov + C2)
      const denominator = (meanA * meanA + meanB * meanB + C1) * (varA + varB + C2)
      total += denominator === 0 ? 1 : numerator / denominator
      count += 1
    }
  }
  return count === 0 ? 0 : (total / count) * 100
}

/** YIQ weighting of an RGB difference (the classic perceptual-diff scale). */
function yiqDelta(r1, g1, b1, r2, g2, b2) {
  const dr = r1 - r2
  const dg = g1 - g2
  const db = b1 - b2
  const y = 0.29889531 * dr + 0.58662247 * dg + 0.11448223 * db
  const i = 0.59597799 * dr - 0.27417614 * dg - 0.32180185 * db
  const q = 0.21147017 * dr - 0.52261711 * dg + 0.31114694 * db
  return 0.5053 * y * y + 0.299 * i * i + 0.1957 * q * q
}

/** Whether a pixel is on a strong edge in an image (used to tolerate text AA). */
function isEdge(rgba, x, y, width, height, step = 1) {
  const x0 = Math.max(0, x - step)
  const x1 = Math.min(width - 1, x + step)
  const y0 = Math.max(0, y - step)
  const y1 = Math.min(height - 1, y + step)
  const lum = (px, py) => {
    const i = (py * width + px) * 4
    return 0.299 * rgba[i] + 0.587 * rgba[i + 1] + 0.114 * rgba[i + 2]
  }
  const gx = Math.abs(lum(x1, y) - lum(x0, y))
  const gy = Math.abs(lum(x, y1) - lum(x, y0))
  return gx + gy > 48
}

/**
 * Pixel diff over the common area, sampled every `sampleStep` pixels. Anti-
 * aliased text edges are tolerated unless they move by more than a few pixels.
 * @returns {{ratio: number, diffPixels: number, totalPixels: number}}
 */
export function pixelDiff(imageA, imageB, { maskA = null, maskB = null, threshold = DEFAULT_PIXEL_THRESHOLD, sampleStep = 2 } = {}) {
  const width = Math.min(imageA.width, imageB.width)
  const height = Math.min(imageA.height, imageB.height)
  const maxDelta = 35215 * threshold * threshold
  const step = Math.max(1, Math.trunc(sampleStep))
  let diffPixels = 0
  let totalPixels = 0
  for (let y = 0; y < height; y += step) {
    const rowBase = y * width * 4
    const srcBaseA = rowBase
    const srcBaseB = (y * imageB.width) * 4
    for (let x = 0; x < width; x += step) {
      totalPixels += 1
      const ia = srcBaseA + x * 4
      const ib = srcBaseB + x * 4
      if (maskA !== null && maskA.rgba[ia] > 200) continue
      if (maskB !== null && maskB.rgba[ib] > 200) continue
      const delta = yiqDelta(imageA.rgba[ia], imageA.rgba[ia + 1], imageA.rgba[ia + 2], imageB.rgba[ib], imageB.rgba[ib + 1], imageB.rgba[ib + 2])
      if (delta <= maxDelta) continue
      // Tolerate anti-aliasing: a pixel on a strong edge in both images whose
      // neighbourhood is also near the threshold is text/edge rendering, not a
      // structural difference.
      if (delta < maxDelta * 6 && isEdge(imageA.rgba, x, y, imageA.width, imageA.height) && isEdge(imageB.rgba, x, y, imageB.width, imageB.height)) {
        continue
      }
      diffPixels += 1
    }
  }
  return { ratio: totalPixels === 0 ? 0 : diffPixels / totalPixels, diffPixels, totalPixels }
}

/** Build a full-size diff image (red where mismatched, dim greyscale elsewhere). */
export function diffImage(imageA, imageB, { maskA = null, maskB = null, threshold = DEFAULT_PIXEL_THRESHOLD } = {}) {
  const width = Math.min(imageA.width, imageB.width)
  const height = Math.min(imageA.height, imageB.height)
  const out = new Uint8Array(width * height * 4)
  const maxDelta = 35215 * threshold * threshold
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const ia = (y * width + x) * 4
      const ib = (y * imageB.width + x) * 4
      const o = ia
      const grey = (0.299 * imageA.rgba[ia] + 0.587 * imageA.rgba[ia + 1] + 0.114 * imageA.rgba[ia + 2]) * 0.35
      const masked = (maskA !== null && maskA.rgba[ia] > 200) || (maskB !== null && maskB.rgba[ib] > 200)
      const delta = masked
        ? 0
        : yiqDelta(imageA.rgba[ia], imageA.rgba[ia + 1], imageA.rgba[ia + 2], imageB.rgba[ib], imageB.rgba[ib + 1], imageB.rgba[ib + 2])
      if (!masked && delta > maxDelta) {
        out[o] = Math.min(255, 200 + Math.sqrt(delta) * 0.3)
        out[o + 1] = 32
        out[o + 2] = 64
        out[o + 3] = 255
      } else if (masked) {
        out[o] = 32
        out[o + 1] = 64
        out[o + 2] = 96
        out[o + 3] = 255
      } else {
        out[o] = grey
        out[o + 1] = grey
        out[o + 2] = grey
        out[o + 3] = 255
      }
    }
  }
  return { width, height, rgba: out }
}

/**
 * Compare one viewport's screenshots. Both images may have different heights;
 * only their common area is compared, and the height difference lowers the
 * score (a rebuilt page that is twice as tall is not "the same page").
 * @param {{width: number, height: number, rgba: Uint8Array}} original
 * @param {{width: number, height: number, rgba: Uint8Array}} built
 * @param {{maskOriginal?: object|null, maskBuilt?: object|null, threshold?: number, includeDiffImage?: boolean}} options
 */
export function compareViewport(original, built, options = {}) {
  const started = process.hrtime.bigint()
  const commonWidth = Math.min(original.width, built.width)
  const commonHeight = Math.min(original.height, built.height)
  const heightRatio = Math.max(original.height, built.height) === 0 ? 1 : 1 - Math.abs(original.height - built.height) / Math.max(original.height, built.height)
  const bandScores = []
  const regionAcc = []
  const maskOriginal = options.maskOriginal && options.maskOriginal.rgba ? options.maskOriginal : null
  const maskBuilt = options.maskBuilt && options.maskBuilt.rgba ? options.maskBuilt : null
  for (let bandY = 0; bandY < commonHeight; bandY += BAND_HEIGHT) {
    const bandH = Math.min(BAND_HEIGHT, commonHeight - bandY)
    if (bandH < 8) continue
    const bandW = commonWidth
    const dw = Math.min(BAND_WIDTH, bandW)
    const dh = Math.max(8, Math.round((bandH * dw) / bandW))
    const cropA = { width: bandW, height: bandH, rgba: cropRgba(original, 0, bandY, bandW, bandH) }
    const cropB = { width: bandW, height: bandH, rgba: cropRgba(built, 0, bandY, bandW, bandH) }
    const maskCropA = maskOriginal ? { width: commonWidth, height: commonHeight, rgba: cropRgba(maskOriginal, 0, bandY, commonWidth, commonHeight) } : null
    const maskCropB = maskBuilt ? { width: commonWidth, height: commonHeight, rgba: cropRgba(maskBuilt, 0, bandY, commonWidth, commonHeight) } : null
    const scaledA = downscaleRgba(cropA, dw, dh, maskCropA ? { width: bandW, height: bandH, rgba: maskCropA.rgba } : null)
    const scaledB = downscaleRgba(cropB, dw, dh, maskCropB ? { width: bandW, height: bandH, rgba: maskCropB.rgba } : null)
    const masked = new Uint8Array(dw * dh)
    for (let i = 0; i < masked.length; i += 1) masked[i] = scaledA.masked[i] | scaledB.masked[i]
    const layout = tileSimilarity(scaledA.rgba, scaledB.rgba, dw, dh, masked)
    const lumaA = lumaPlane(scaledA.rgba, dw, dh)
    const lumaB = lumaPlane(scaledB.rgba, dw, dh)
    const detail = blockSsim(lumaA, lumaB, dw, dh)
    const weight = bandH
    bandScores.push({ layout, detail, weight, top: bandY })
    // Report the worst tiles of this band as fix regions.
    const worst = worstTiles(scaledA.rgba, scaledB.rgba, dw, dh, masked, 2)
    for (const tile of worst) {
      regionAcc.push({
        x: Math.round((tile.x0 / dw) * 1000) / 10,
        y: Math.round(((bandY + (tile.y0 / dh) * bandH) / Math.max(1, commonHeight)) * 1000) / 10,
        w: Math.round(((tile.x1 - tile.x0) / dw) * 1000) / 10,
        h: Math.round(((tile.y1 - tile.y0) / dh) * bandH / Math.max(1, commonHeight) * 1000) / 10,
        delta: Math.round(tile.delta * 1000) / 1000,
      })
    }
  }
  let layout = 0
  let detail = 0
  let totalWeight = 0
  for (const band of bandScores) {
    layout += band.layout * band.weight
    detail += band.detail * band.weight
    totalWeight += band.weight
  }
  layout = totalWeight > 0 ? layout / totalWeight : 0
  detail = totalWeight > 0 ? detail / totalWeight : 0
  const pixel = pixelDiff(original, built, {
    maskA: maskOriginal,
    maskB: maskBuilt,
    threshold: options.threshold ?? DEFAULT_PIXEL_THRESHOLD,
  })
  const heightPenalty = 1 - 0.25 * Math.min(1, 1 - heightRatio)
  const score = Math.max(0, Math.min(100, (layout * 0.5 + detail * 0.5) * heightPenalty))
  regionAcc.sort((a, b) => b.delta - a.delta)
  const durationMs = Number(process.hrtime.bigint() - started) / 1e6
  return {
    score: round1(score),
    layout: round1(layout),
    detail: round1(detail),
    heightRatio: round3(heightRatio),
    heights: { original: original.height, built: built.height },
    pixel,
    regions: regionAcc.slice(0, 8),
    bands: bandScores.length,
    durationMs: round1(durationMs),
  }
}

/** The `count` worst tiles of a comparison canvas, for the fix list. */
function worstTiles(rgbaA, rgbaB, width, height, masked, count) {
  const rows = 6
  const cols = 8
  const tiles = []
  for (let ty = 0; ty < rows; ty += 1) {
    const y0 = Math.floor((ty * height) / rows)
    const y1 = Math.max(y0 + 1, Math.floor(((ty + 1) * height) / rows))
    for (let tx = 0; tx < cols; tx += 1) {
      const x0 = Math.floor((tx * width) / cols)
      const x1 = Math.max(x0 + 1, Math.floor(((tx + 1) * width) / cols))
      let covered = 0
      let total = 0
      for (let y = y0; y < y1; y += 1) {
        for (let x = x0; x < x1; x += 1) {
          total += 1
          covered += masked[y * width + x]
        }
      }
      if (total > 0 && covered / total >= 0.6) continue
      const a = tileMean(rgbaA, width, x0, y0, x1, y1)
      const b = tileMean(rgbaB, width, x0, y0, x1, y1)
      const delta = Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2) / 441.6729559300637
      tiles.push({ x0, y0, x1, y1, delta })
    }
  }
  tiles.sort((a, b) => b.delta - a.delta)
  return tiles.slice(0, count)
}

function round1(value) {
  return Math.round(value * 10) / 10
}

function round3(value) {
  return Math.round(value * 1000) / 1000
}

// ---------------------------------------------------------------------------
// Noise masks
// ---------------------------------------------------------------------------

/**
 * Build a mask of pixels a rebuilt page must not be judged on: pixels that
 * changed between two captures of the original (animations, carousels, clocks)
 * and every self-changing media rectangle (video, canvas, iframe, embeds).
 * White pixels are ignored by the comparison; the rest stays black.
 *
 * @param {{width:number,height:number,rgba:Uint8Array}} imageA first capture
 * @param {{width:number,height:number,rgba:Uint8Array}} imageB second capture
 * @param {Array<{x:number,y:number,w:number,h:number}>} rects page-coordinate media rects
 * @param {{threshold?: number, margin?: number}} options
 * @returns {{png: Buffer, width: number, height: number, maskedPixels: number, maskedRatio: number, dynamicRects: number}}
 */
export function noiseMask(imageA, imageB, rects = [], { threshold = 0.12, margin = 8 } = {}) {
  const width = Math.min(imageA.width, imageB.width)
  const height = Math.min(imageA.height, imageB.height)
  const out = new Uint8Array(width * height * 4)
  const maxDelta = 35215 * threshold * threshold
  const flagged = new Uint8Array(width * height)
  let dynamicRects = 0
  for (const rect of Array.isArray(rects) ? rects : []) {
    if (!rect || typeof rect !== 'object') continue
    const x0 = Math.max(0, Math.floor(Number(rect.x ?? 0) - margin))
    const y0 = Math.max(0, Math.floor(Number(rect.y ?? 0) - margin))
    const x1 = Math.min(width, Math.ceil(Number(rect.x ?? 0) + Number(rect.w ?? 0) + margin))
    const y1 = Math.min(height, Math.ceil(Number(rect.y ?? 0) + Number(rect.h ?? 0) + margin))
    if (x1 <= x0 || y1 <= y0) continue
    dynamicRects += 1
    for (let y = y0; y < y1; y += 1) {
      flagged.fill(1, y * width + x0, y * width + x1)
    }
  }
  let maskedPixels = 0
  for (let y = 0; y < height; y += 1) {
    const rowA = y * imageA.width * 4
    const rowB = y * imageB.width * 4
    for (let x = 0; x < width; x += 1) {
      const ia = rowA + x * 4
      const ib = rowB + x * 4
      const o = (y * width + x) * 4
      let masked = flagged[y * width + x] === 1
      if (!masked) {
        const delta = yiqDelta(imageA.rgba[ia], imageA.rgba[ia + 1], imageA.rgba[ia + 2], imageB.rgba[ib], imageB.rgba[ib + 1], imageB.rgba[ib + 2])
        masked = delta > maxDelta
      }
      if (masked) {
        out[o] = 255
        out[o + 1] = 255
        out[o + 2] = 255
        out[o + 3] = 255
        maskedPixels += 1
      } else {
        out[o + 3] = 255
      }
    }
  }
  return {
    png: encodePng(out, width, height),
    width,
    height,
    maskedPixels,
    maskedRatio: width * height === 0 ? 0 : Math.round((maskedPixels / (width * height)) * 10000) / 10000,
    dynamicRects,
  }
}

// ---------------------------------------------------------------------------
// Capture-document comparison (text, structure, design, health)
// ---------------------------------------------------------------------------

/** Word frequency map of a page's visible text (CJK runs become character bigrams). */
export function wordCounts(text) {
  const counts = new Map()
  const source = typeof text === 'string' ? text : ''
  const cjk = /[\u3040-\u30ff\u3400-\u9fff\uf900-\ufaff]/u
  for (const token of source.split(/[^\p{L}\p{N}]+/gu)) {
    if (token.length < 2) continue
    if (cjk.test(token)) {
      for (let index = 0; index + 1 < token.length; index += 1) {
        const bigram = token.slice(index, index + 2)
        counts.set(bigram, (counts.get(bigram) ?? 0) + 1)
      }
    } else {
      const key = token.toLowerCase()
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
  }
  return counts
}

/**
 * Visible-text likeness: Dice coefficient over word counts (0..100), the
 * original's missing headings and most frequent missing words.
 */
export function textLikeness(original, built) {
  const a = wordCounts(original?.text ?? '')
  const totalA = [...a.values()].reduce((sum, n) => sum + n, 0)
  if (totalA === 0) return null
  const b = wordCounts(built?.text ?? '')
  let shared = 0
  for (const [word, count] of a) shared += Math.min(count, b.get(word) ?? 0)
  const totalB = [...b.values()].reduce((sum, n) => sum + n, 0)
  const similarity = totalB + totalA === 0 ? 0 : (200 * shared) / (totalA + totalB)
  const norm = (text) => String(text ?? '').split(/\s+/u).filter(Boolean).join(' ').toLowerCase()
  const builtHeadings = new Set((built?.headings ?? []).map((heading) => norm(heading.text)))
  const missingHeadings = (original?.headings ?? [])
    .filter((heading) => heading.text && heading.text.trim() && !builtHeadings.has(norm(heading.text)))
    .slice(0, 8)
    .map((heading) => heading.text.trim())
  const missingWords = [...a.entries()]
    .filter(([word]) => !b.has(word))
    .sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0]))
    .slice(0, 12)
    .map(([word]) => word)
  return { similarity: round1(similarity), missingHeadings, missingWords }
}

/** The structural parts compared, as (tag or role) → plain name. */
const PARTS = [
  ['header', 'header'],
  ['nav', 'navigation bar'],
  ['main', 'main area'],
  ['footer', 'footer'],
  ['section', 'section'],
  ['article', 'article'],
  ['aside', 'sidebar'],
  ['form', 'form'],
  ['h1', 'top heading'],
  ['h2', 'subheading'],
  ['h3', 'subheading'],
  ['h4', 'subheading'],
  ['ul', 'list'],
  ['ol', 'list'],
  ['img', 'image'],
  ['video', 'video'],
  ['button', 'button'],
  ['input', 'form field'],
  ['select', 'form field'],
  ['textarea', 'form field'],
]

/** The page's parts in document order, from a capture's outline. */
export function skeleton(capture) {
  const out = []
  const roleToTag = { banner: 'header', navigation: 'nav', main: 'main', contentinfo: 'footer', complementary: 'aside', form: 'form', search: 'form', button: 'button', img: 'img' }
  for (const item of capture?.outline ?? []) {
    const tag = roleToTag[item.role] ?? item.tag
    const part = PARTS.find(([t]) => t === tag)
    if (part) out.push(part[1])
  }
  return out
}

/** Longest common subsequence length (Uint32 dynamic programming). */
function lcsLength(a, b) {
  const row = new Uint32Array(b.length + 1)
  for (let i = 0; i < a.length; i += 1) {
    let diag = 0
    for (let j = 0; j < b.length; j += 1) {
      const up = row[j + 1]
      row[j + 1] = a[i] === b[j] ? diag + 1 : Math.max(up, row[j])
      diag = up
    }
  }
  return row[b.length]
}

/** Page-structure likeness (LCS over parts) plus the parts the original has more of. */
export function structureLikeness(original, built) {
  const a = skeleton(original)
  if (a.length === 0) return null
  const b = skeleton(built)
  const similarity = b.length + a.length === 0 ? 0 : (200 * lcsLength(a, b)) / (a.length + b.length)
  const count = (list, name) => list.filter((part) => part === name).length
  const missing = []
  for (const [, name] of PARTS) {
    if (missing.some(([n]) => n === name)) continue
    const more = count(a, name) - count(b, name)
    if (more > 0) missing.push([name, more])
  }
  missing.sort((x, y) => y[1] - x[1])
  return { similarity: round1(similarity), missing: missing.slice(0, 6) }
}

/** `#rrggbb`/`#rrggbbaa` → [r,g,b,a], or null. */
export function rgbaOf(value) {
  const text = String(value ?? '').trim().toLowerCase()
  if (text.startsWith('rgb')) {
    const numbers = text.replace(/^rgba?\(|\)$/gu, '').split(/[,\s/]+/u).filter(Boolean).map(Number)
    if (numbers.length < 3 || numbers.some((n) => !Number.isFinite(n))) return null
    return [clamp(numbers[0], 0, 255, 0), clamp(numbers[1], 0, 255, 0), clamp(numbers[2], 0, 255, 0), numbers.length > 3 ? Math.round(clamp(numbers[3], 0, 1, 1) * 255) : 255]
  }
  if (!text.startsWith('#')) return null
  const hex = text.slice(1)
  const byte = (i) => parseInt(hex.slice(i, i + 2), 16)
  if (hex.length === 6 && /^[0-9a-f]{6}$/u.test(hex)) return [byte(0), byte(2), byte(4), 255]
  if (hex.length === 8 && /^[0-9a-f]{8}$/u.test(hex)) return [byte(0), byte(2), byte(4), byte(6)]
  if (hex.length === 3 && /^[0-9a-f]{3}$/u.test(hex)) {
    const expand = (c) => parseInt(c + c, 16)
    return [expand(hex[0]), expand(hex[1]), expand(hex[2]), 255]
  }
  return null
}

/** Two colours that look the same: each channel within 3, or the same text. */
export function sameColour(a, b) {
  const x = rgbaOf(a)
  const y = rgbaOf(b)
  if (x && y) return x.every((value, index) => Math.abs(value - y[index]) <= 3)
  return String(a).toLowerCase() === String(b).toLowerCase()
}

/** The first family of a CSS font stack, cleaned of generated prefixes. */
export function fontFamilyName(stack) {
  const first = String(stack ?? '').split(',')[0].trim().replace(/^["']|["']$/gu, '')
  return first.replace(/^_+/u, '').split('_')[0] || first
}

/** Values of a capture's `design.<key>` list, most used first. */
function designValues(capture, key) {
  return (capture?.design?.[key] ?? []).map((entry) => entry.value).filter((value) => typeof value === 'string')
}

/** Measured design differences that a person would see, as plain sentences. */
export function designNotes(original, built) {
  const out = []
  const missingColours = []
  for (const [key, what] of [
    ['backgrounds', 'background'],
    ['textColors', 'text'],
  ]) {
    const ours = designValues(built, key)
    for (const colour of designValues(original, key).slice(0, 6)) {
      if (!ours.some((value) => sameColour(value, colour))) missingColours.push(`${colour} (${what})`)
    }
  }
  if (missingColours.length > 0) out.push(`colours the original uses that the build doesn't: ${missingColours.join(', ')}`)
  const originalFont = designValues(original, 'fonts')[0]
  const builtFont = designValues(built, 'fonts')[0]
  if (originalFont && builtFont && fontFamilyName(originalFont).toLowerCase() !== fontFamilyName(builtFont).toLowerCase()) {
    out.push(`main font: ${fontFamilyName(originalFont)} in the original, ${fontFamilyName(builtFont)} in the build`)
  }
  for (const [key, what] of [
    ['fontSizes', 'text sizes'],
    ['spacing', 'spacing'],
  ]) {
    const ours = designValues(built, key)
    const missing = designValues(original, key)
      .slice(0, 8)
      .filter((value) => !ours.includes(value))
    if (missing.length > 0) out.push(`${what} the original uses that the build doesn't: ${missing.join(', ')}`)
  }
  const originalLayout = original?.layouts
  const builtLayout = built?.layouts
  if (originalLayout && builtLayout) {
    if (originalLayout.pageW > originalLayout.width + 1 && builtLayout.pageW <= builtLayout.width + 1) {
      // The original scrolls sideways here too; not a build defect.
    } else if (builtLayout.pageW > builtLayout.width + 1 && originalLayout.pageW <= originalLayout.width + 1) {
      out.push(`the page scrolls sideways at ${builtLayout.width} px (${builtLayout.pageW} px wide)`)
    }
    for (const [key, name] of [
      ['h1', 'top heading'],
      ['h2', 'subheading'],
      ['body', 'body text'],
    ]) {
      const a = originalLayout.type?.[key] ?? 0
      const b = builtLayout.type?.[key] ?? 0
      if (a > 0 && b > 0 && Math.abs(a - b) > 2) out.push(`${name} ${b} px, the original's ${a} px (at ${builtLayout.width} px)`)
    }
    const blockNotes = blockDiffs(originalLayout.blocks ?? [], builtLayout.blocks ?? [])
    out.push(...blockNotes)
  }
  return out.slice(0, 14)
}

/** Pair sections by tag+heading then by tag, and name padding/per-row/column differences. */
export function blockDiffs(originalBlocks, builtBlocks) {
  const key = (block) => [String(block.tag ?? ''), String(block.heading ?? '').split(/\s+/u).filter(Boolean).join(' ').toLowerCase()]
  const partner = new Array(originalBlocks.length).fill(null)
  const taken = new Array(builtBlocks.length).fill(false)
  const pairBy = (same) => {
    for (let i = 0; i < originalBlocks.length; i += 1) {
      if (partner[i] !== null) continue
      const j = builtBlocks.findIndex((block, index) => !taken[index] && same(originalBlocks[i], block))
      if (j >= 0) {
        taken[j] = true
        partner[i] = j
      }
    }
  }
  pairBy((a, b) => key(a)[0] === key(b)[0] && key(a)[1] === key(b)[1])
  pairBy((a, b) => key(a)[0] === key(b)[0])
  const out = []
  for (let i = 0; i < originalBlocks.length; i += 1) {
    const a = originalBlocks[i]
    const b = partner[i] === null ? null : builtBlocks[partner[i]]
    if (!b) continue
    const what = []
    const padA = Array.isArray(a.pad) ? a.pad : []
    const padB = Array.isArray(b.pad) ? b.pad : []
    if (padA.length === padB.length && padA.some((value, index) => Math.abs(value - padB[index]) > 4)) {
      what.push(`padding ${padB.join(' ')} vs the original's ${padA.join(' ')}`)
    }
    const grid = !['nav', 'header'].includes(String(a.tag ?? ''))
    if (grid && Number.isFinite(a.perRow) && Number.isFinite(b.perRow) && a.perRow !== b.perRow) what.push(`${b.perRow} per row vs ${a.perRow}`)
    if (Number.isFinite(a.column) && Number.isFinite(b.column) && Math.abs(a.column - b.column) > 8) what.push(`content column ${b.column} px vs ${a.column} px`)
    if (what.length === 0) continue
    const name = key(a)[1] ? `the "${a.heading}" ${a.tag}` : `the ${a.tag}`
    out.push(`${name}: ${what.join(', ')}`)
  }
  return out.slice(0, 6)
}

/** Health problems the build has that the original doesn't. */
export function healthNotes(original, built) {
  const out = []
  const normalize = (text) =>
    String(text ?? '')
      .replace(/\b(?:https?:\/\/)?[^\s"'<>]+/gu, (match) => match.replace(/^https?:\/\/[^/]+/u, ''))
      .replace(/\b\d+\b/gu, '#')
  const originalErrors = new Set((original?.health?.consoleErrors ?? []).map(normalize))
  const newErrors = (built?.health?.consoleErrors ?? []).filter((error) => !originalErrors.has(normalize(error)))
  if (newErrors.length > 0) out.push(`the build logs ${newErrors.length} error(s) the original doesn't: ${newErrors.slice(0, 3).map((e) => `"${e}"`).join('; ')}`)
  const pathOf = (url) => {
    try {
      return new URL(url).pathname
    } catch {
      return String(url)
    }
  }
  // The browser asks every site for /favicon.ico; a missing one is not a build defect.
  const isNoise = (url) => /\/favicon\.ico$/u.test(pathOf(url))
  const originalFailures = new Set((original?.health?.failedRequests ?? []).filter((failure) => !isNoise(failure.url)).map((failure) => pathOf(failure.url)))
  const newFailures = (built?.health?.failedRequests ?? []).filter((failure) => !isNoise(failure.url) && !originalFailures.has(pathOf(failure.url)))
  if (newFailures.length > 0) out.push(`${newFailures.length} request(s) fail in the build: ${newFailures.slice(0, 5).map((failure) => pathOf(failure.url)).join(', ')}`)
  const count = (capture, key) => capture?.a11y?.[key] ?? 0
  if (built?.a11y) {
    if (count(built, 'imagesWithoutAlt') > count(original, 'imagesWithoutAlt')) out.push('pictures in the build lack alt text the original has')
    if (count(built, 'unnamedControls') > count(original, 'unnamedControls')) out.push('controls in the build have no accessible name the original has')
  }
  return out.slice(0, 6)
}

/** Objective pass/fail claims, judged only where both captures hold the evidence. */
export function buildClaims(original, built) {
  const claims = []
  const originalLayout = original?.layouts
  const builtLayout = built?.layouts
  if (originalLayout && builtLayout) {
    if (builtLayout.pageW <= builtLayout.width + 1) {
      claims.push({ title: `doesn't scroll sideways at ${builtLayout.width} px`, passed: true, detail: '' })
    } else if (originalLayout.pageW <= originalLayout.width + 1) {
      claims.push({ title: `doesn't scroll sideways at ${builtLayout.width} px`, passed: false, detail: `it is ${builtLayout.pageW} px wide` })
    }
  }
  if (original?.health && built?.health) {
    const notes = healthNotes(original, built)
    claims.push({ title: 'logs no errors the original does not', passed: !notes.some((note) => note.includes('logs')), detail: notes.find((note) => note.includes('logs')) ?? '' })
    claims.push({ title: 'loads every file it asks for', passed: !notes.some((note) => note.includes('request(s) fail')), detail: notes.find((note) => note.includes('request(s) fail')) ?? '' })
  }
  const landmarks = (capture) => Object.keys(capture?.a11y?.landmarks ?? {})
  const theirs = landmarks(original)
  if (theirs.length > 0 && built?.a11y) {
    const ours = new Set(landmarks(built))
    const missing = theirs.filter((landmark) => !ours.has(landmark))
    claims.push({ title: "has the original's landmarks", passed: missing.length === 0, detail: missing.length ? `missing: ${missing.join(', ')}` : '' })
  }
  return claims
}

/** Grades used by the panel and the tools. */
export function gradeForScore(score) {
  if (score >= 97) return 'S'
  if (score >= 90) return 'A'
  if (score >= 80) return 'B'
  if (score >= 65) return 'C'
  if (score >= 45) return 'D'
  return 'E'
}

/** Dice overlap of two weighted value lists, matching near-equal colours/counts. */
function diceOver(a, b, same) {
  const left = Array.isArray(a) ? [...a] : []
  const right = Array.isArray(b) ? [...b] : []
  const totalA = left.reduce((sum, row) => sum + row.count, 0)
  const totalB = right.reduce((sum, row) => sum + row.count, 0)
  if (totalA + totalB === 0) return 1
  let shared = 0
  for (const rowA of left) {
    let remaining = rowA.count
    for (const rowB of right) {
      if (remaining <= 0 || rowB.count <= 0) continue
      if (!same(rowA.value, rowB.value)) continue
      const take = Math.min(remaining, rowB.count)
      shared += take
      remaining -= take
      rowB.count -= take
    }
  }
  return (2 * shared) / (totalA + totalB)
}

/** Colour palette likeness (0..1): background and text colours weighted equally. */
export function colourSimilarity(original, built) {
  const merge = (capture, key) => (capture?.design?.[key] ?? []).slice(0, 12).map((entry) => ({ value: entry.value, count: entry.count }))
  const a = [...merge(original, 'backgrounds'), ...merge(original, 'textColors')]
  const b = [...merge(built, 'backgrounds'), ...merge(built, 'textColors')]
  return diceOver(a, b, (x, y) => sameColour(x, y))
}

/** Font-size scale likeness (0..1). */
export function sizeSimilarity(original, built) {
  const list = (capture) => (capture?.design?.fontSizes ?? []).slice(0, 14).map((entry) => ({ value: String(entry.value), count: entry.count }))
  return diceOver(list(original), list(built), (x, y) => x === y)
}

/** Font-family likeness (0..1): exact first family plus the family set. */
export function fontSimilarity(original, built) {
  const families = (capture) => (capture?.design?.fonts ?? []).slice(0, 10).map((entry) => ({ value: String(entry.value).toLowerCase(), count: entry.count }))
  const dice = diceOver(families(original), families(built), (x, y) => x === y)
  const mainA = fontFamilyName(designValues(original, 'fonts')[0] ?? '').toLowerCase()
  const mainB = fontFamilyName(designValues(built, 'fonts')[0] ?? '').toLowerCase()
  const main = mainA && mainB ? (mainA === mainB ? 1 : 0) : 0.5
  return dice * 0.6 + main * 0.4
}

/**
 * Design-token likeness 0..100: how much of the measured visual language the
 * build reproduces (palette 55%, font families 25%, type scale 20%).
 */
export function tokenSimilarity(original, built) {
  const colour = colourSimilarity(original, built)
  const font = fontSimilarity(original, built)
  const sizes = sizeSimilarity(original, built)
  return { score: round1((colour * 0.55 + font * 0.25 + sizes * 0.2) * 100), colour: round1(colour * 100), font: round1(font * 100), sizes: round1(sizes * 100) }
}

/**
 * Combine the image metrics and the design-token metric into the 0–100 score.
 * 40% layout + 40% perceptual detail + 20% measured design language, times the
 * page-height penalty. The token share keeps a structurally similar but
 * wrongly-coloured build from scoring "done".
 */
export function combineScores({ layout, detail, tokens = 100, heightRatio = 1 }) {
  const base = layout * 0.4 + detail * 0.4 + tokens * 0.2
  const penalty = 1 - 0.25 * Math.min(1, 1 - (Number.isFinite(heightRatio) ? heightRatio : 1))
  return Math.max(0, Math.min(100, round1(base * penalty)))
}

/** Weighted mean of per-width scores; widths without a score are skipped. */
export function aggregateScore(perWidth, weights) {
  let sum = 0
  let weight = 0
  for (const row of perWidth) {
    const w = weights?.[row.width] ?? 1
    sum += row.score * w
    weight += w
  }
  return weight > 0 ? round1(sum / weight) : 0
}
