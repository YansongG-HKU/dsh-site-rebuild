/**
 * dsh-site-rebuild — small shared helpers.
 *
 * Pure functions only (except the two atomic file helpers); every engine module
 * imports from here so the unit tests can exercise the same code paths.
 */

import { createHash, randomBytes } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

/** A one-line message from any thrown value. */
export function messageOf(error) {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  try {
    return JSON.stringify(error)
  } catch {
    return String(error)
  }
}

/** True for a plain (non-array, non-null) object. */
export function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

/** Clamp a number into [min, max], returning the fallback for non-finite input. */
export function clamp(value, min, max, fallback = min) {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

/** Round to an integer deterministically. */
export function toInt(value, fallback = 0) {
  const n = Number(value)
  return Number.isFinite(n) ? Math.round(n) : fallback
}

/** ISO timestamp for persisted records. */
export function nowIso() {
  return new Date().toISOString()
}

/** A short, filesystem-safe id segment from arbitrary text. */
export function slugify(text, fallback = 'project') {
  const slug = String(text ?? '')
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/gu, '-')
    .replace(/^-+|-+$/gu, '')
    .slice(0, 48)
  return slug.length > 0 ? slug : fallback
}

/** A project id: `craft-<yyyymmdd-hhmmss>-<4 hex>`. */
export function newProjectId(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0')
  const stamp =
    String(date.getUTCFullYear()) +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    '-' +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds())
  return `craft-${stamp}-${randomBytes(2).toString('hex')}`
}

/** FNV-1a 32-bit hex digest of a string (fast, stable, non-cryptographic). */
export function hashText(text) {
  let hash = 0x811c9dc5
  const source = String(text ?? '')
  for (let i = 0; i < source.length; i += 1) {
    hash ^= source.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

/** SHA-256 hex digest of a string or Buffer (used for capture fingerprints). */
export function sha256(value) {
  return createHash('sha256').update(value).digest('hex')
}

/** UTF-8 byte length. */
export function byteLength(value) {
  return Buffer.byteLength(typeof value === 'string' ? value : JSON.stringify(value ?? null), 'utf8')
}

/** Cut a string to a UTF-8 byte budget without splitting a code point. */
export function truncateUtf8(text, maxBytes) {
  const source = typeof text === 'string' ? text : String(text ?? '')
  if (Buffer.byteLength(source, 'utf8') <= maxBytes) return { text: source, truncated: false }
  let lo = 0
  let hi = source.length
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (Buffer.byteLength(source.slice(0, mid), 'utf8') <= maxBytes) lo = mid
    else hi = mid - 1
  }
  return { text: source.slice(0, lo), truncated: true }
}

/** Ensure a directory exists. */
export async function ensureDir(path) {
  await mkdir(path, { recursive: true })
  return path
}

/** Remove a directory recursively (missing is fine). */
export async function rmDir(path) {
  await rm(path, { recursive: true, force: true })
}

/** Read and parse a JSON file, or return the fallback when missing/broken. */
export async function readJsonFile(path, fallback = null) {
  try {
    const text = await readFile(path, 'utf8')
    return JSON.parse(text)
  } catch {
    return fallback
  }
}

/** JSON with sorted keys, for stable fingerprints and diffs. */
export function stableJson(value) {
  return JSON.stringify(sortKeys(value))
}

function sortKeys(value) {
  if (Array.isArray(value)) return value.map(sortKeys)
  if (isPlainObject(value)) {
    const out = {}
    for (const key of Object.keys(value).sort()) out[key] = sortKeys(value[key])
    return out
  }
  return value
}

/**
 * Write a file atomically: a temp file beside the target, then a rename.
 * Concurrent writers of the same target are serialised by the caller's lock.
 */
export async function writeFileAtomic(path, data) {
  await ensureDir(dirname(path))
  const temp = join(dirname(path), `.${process.pid}-${Date.now()}-${randomBytes(3).toString('hex')}.tmp`)
  await writeFile(temp, data)
  try {
    await rename(temp, path)
  } catch (error) {
    await rm(temp, { force: true }).catch(() => {})
    throw error
  }
}

/** Write JSON atomically (2-space indented, trailing newline). */
export async function writeJsonAtomic(path, value) {
  await writeFileAtomic(path, JSON.stringify(value, null, 2) + '\n')
}

/** Resolve whether a path exists. */
export function pathExists(path) {
  return existsSync(path)
}

/** First non-empty string among the arguments, else ''. */
export function firstString(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim().length > 0) return value.trim()
  }
  return ''
}

/** Human byte label used in notes. */
export function formatBytes(bytes) {
  const n = Number(bytes)
  if (!Number.isFinite(n) || n < 0) return '0 B'
  if (n < 1024) return `${Math.round(n)} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}
