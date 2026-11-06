/**
 * dsh-site-rebuild — evidence records.
 *
 * An evidence record is the honest unit of knowledge a study produced: what was
 * seen, how sure we are, what part of the target it covers, what it cannot say,
 * and where it came from. Tools return bounded summaries; the panel pages the
 * full records. Confidence is calibrated against how the value was obtained
 * (computed styles read by the browser are near-certain; an inferred breakpoint
 * is a reading of the CSS, not a guarantee).
 */

import { LIMITS } from './config.js'
import { byteLength, hashText, truncateUtf8 } from './util.js'

/** Confidence presets so every producer uses the same scale. */
export const CONFIDENCE = Object.freeze({
  measured: 0.98,
  extracted: 0.95,
  inferred: 0.85,
  heuristic: 0.7,
  unknown: 0.4,
})

/**
 * Build one evidence record.
 * @param {object} input
 * @param {string} input.kind stable kind, e.g. 'design-tokens'
 * @param {string} input.title human title
 * @param {string} input.summary one-paragraph summary
 * @param {number} input.confidence 0..1
 * @param {string[]} [input.coverage] what it covers
 * @param {string[]} [input.limitations] what it cannot say
 * @param {Array<{path?: string, detail?: string, url?: string}>} [input.locations]
 * @param {string} [input.width] viewport width the record belongs to
 * @param {unknown} [input.data] machine-readable payload
 * @param {string} [input.tool] producer tool id
 * @param {string} [input.mode] 'clean' | 'deep'
 */
export function createEvidence(input) {
  const kind = String(input?.kind ?? 'unknown')
  const title = String(input?.title ?? kind)
  const summary = String(input?.summary ?? '')
  const data = input?.data ?? null
  const confidence = clamp01(input?.confidence, CONFIDENCE.heuristic)
  const record = {
    id: '',
    kind,
    title,
    summary,
    confidence,
    confidenceLabel: confidence >= 0.9 ? 'measured' : confidence >= 0.8 ? 'extracted' : confidence >= 0.65 ? 'inferred' : 'heuristic',
    coverage: Array.isArray(input?.coverage) ? input.coverage.filter((x) => typeof x === 'string').slice(0, 12) : [],
    limitations: Array.isArray(input?.limitations) ? input.limitations.filter((x) => typeof x === 'string').slice(0, 12) : [],
    locations: Array.isArray(input?.locations)
      ? input.locations
          .filter((x) => x && typeof x === 'object')
          .slice(0, 20)
          .map((x) => ({ path: firstText(x.path), url: firstText(x.url), detail: firstText(x.detail) }))
      : [],
    width: typeof input?.width === 'number' ? input.width : undefined,
    data,
    tool: typeof input?.tool === 'string' ? input.tool : '',
    mode: input?.mode === 'deep' ? 'deep' : 'clean',
    createdAt: new Date().toISOString(),
  }
  if (byteLength(JSON.stringify(record.data)) > LIMITS.maxEvidenceBytes) {
    const bounded = truncateUtf8(JSON.stringify(record.data), LIMITS.maxEvidenceBytes)
    record.data = { truncated: true, json: bounded.text }
    record.limitations = [...record.limitations, 'payload exceeded the evidence size cap and was truncated'].slice(0, 12)
  }
  record.id = `ev-${hashText(kind + '|' + title + '|' + record.createdAt + '|' + String(record.data).slice(0, 200))}`
  return record
}

/** Clamp a confidence value into 0.05..1. */
function clamp01(value, fallback) {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.min(1, Math.max(0.05, n))
}

function firstText(value) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined
}

/** One page of a project's evidence, optionally filtered by kind. */
export function pageEvidence(records, { offset = 0, limit = 10, kind = '' } = {}) {
  const all = Array.isArray(records) ? records : []
  const filtered = typeof kind === 'string' && kind.length > 0 ? all.filter((record) => record.kind === kind) : all
  const start = Math.min(Math.max(0, Math.trunc(offset)), filtered.length)
  const take = Math.min(Math.max(1, Math.trunc(limit)), 50)
  return {
    total: filtered.length,
    offset: start,
    limit: take,
    returned: Math.min(take, filtered.length - start),
    records: filtered.slice(start, start + take),
    kinds: [...new Set(all.map((record) => record.kind))],
  }
}

/** Aggregate an evidence list into a compact health line. */
export function evidenceSummary(records) {
  const all = Array.isArray(records) ? records : []
  const byKind = {}
  let lowest = 1
  for (const record of all) {
    byKind[record.kind] = (byKind[record.kind] ?? 0) + 1
    if (typeof record.confidence === 'number') lowest = Math.min(lowest, record.confidence)
  }
  return { count: all.length, byKind, lowestConfidence: all.length > 0 ? lowest : null }
}
