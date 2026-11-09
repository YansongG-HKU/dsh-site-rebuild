/**
 * dsh-site-rebuild — in-process job runner.
 *
 * A study or check takes seconds; the panel starts it and polls. Jobs are
 * intentionally not durable: a restart is a clean slate, and the project record
 * itself holds the durable result. Only one job may run per project at a time.
 */

import { randomBytes } from 'node:crypto'
import { LIMITS } from './config.js'
import { messageOf, nowIso } from './util.js'

/** A job id: `job-<8 hex>`. */
function newJobId() {
  return `job-${randomBytes(4).toString('hex')}`
}

/**
 * Create the job runner.
 * @param {{log?: {warn: Function}, maxJobs?: number}} options
 */
export function createJobs({ log, maxJobs = 40 } = {}) {
  const jobs = new Map()
  const order = []
  const activeByProject = new Map()
  let disposed = false

  const warn = (message) => {
    try {
      log?.warn?.(message)
    } catch {
      /* logging never breaks a job */
    }
  }

  /** Trim old finished jobs beyond the cap. */
  function prune() {
    while (order.length > maxJobs) {
      const id = order.shift()
      const job = jobs.get(id)
      if (!job || job.status === 'running') {
        if (job) order.push(id)
        break
      }
      jobs.delete(id)
    }
  }

  /**
   * Start one job.
   * @param {{projectId: string, kind: string, label?: string, timeoutMs?: number}} spec
   * @param {(context: {signal: AbortSignal, onProgress: Function}) => Promise<unknown>} run
   */
  function start(spec, run) {
    if (disposed) throw new Error('job runner has been disposed')
    const projectId = String(spec.projectId ?? '')
    if (activeByProject.has(projectId)) {
      const error = new Error('this project already has a running job')
      error.code = 'busy'
      throw error
    }
    const id = newJobId()
    const controller = new AbortController()
    const job = {
      id,
      projectId,
      controller,
      kind: String(spec.kind ?? 'job'),
      label: String(spec.label ?? spec.kind ?? 'job'),
      status: 'running',
      startedAt: nowIso(),
      finishedAt: null,
      progress: { phase: 'starting', pct: 0, message: '准备中' },
      error: null,
      result: null,
    }
    jobs.set(id, job)
    order.push(id)
    activeByProject.set(projectId, id)

    const onProgress = (progress) => {
      if (job.status !== 'running') return
      if (progress && typeof progress === 'object') {
        job.progress = {
          phase: String(progress.phase ?? job.progress.phase),
          pct: Math.max(0, Math.min(100, Math.round(Number(progress.pct ?? job.progress.pct) || 0))),
          message: String(progress.message ?? job.progress.message),
          width: progress.width,
        }
      }
    }
    const timeoutMs = Math.max(5000, Number(spec.timeoutMs) || LIMITS.jobTimeoutMs)
    const timer = setTimeout(() => {
      if (job.status !== 'running') return
      job.status = 'failed'
      job.error = `任务超时（${Math.round(timeoutMs / 1000)} 秒）`
      job.progress = { phase: 'timeout', pct: 100, message: '超时' }
      job.finishedAt = nowIso()
      controller.abort()
    }, timeoutMs)
    if (typeof timer.unref === 'function') timer.unref()

    Promise.resolve()
      .then(() => {
        controller.signal.throwIfAborted()
        return run({ signal: controller.signal, onProgress })
      })
      .then((result) => {
        if (job.status !== 'running') return
        job.status = 'done'
        job.result = result ?? null
        job.progress = { phase: 'done', pct: 100, message: '完成' }
        job.finishedAt = nowIso()
      })
      .catch((error) => {
        if (job.status !== 'running') return
        job.status = 'failed'
        job.error = messageOf(error)
        job.progress = { phase: 'failed', pct: 100, message: '失败' }
        job.finishedAt = nowIso()
        warn(`job ${id} (${job.kind}) failed: ${messageOf(error)}`)
      })
      .finally(() => {
        clearTimeout(timer)
        if (activeByProject.get(projectId) === id) activeByProject.delete(projectId)
        prune()
      })
    return publicJob(job)
  }

  /** Cancel a running job. */
  function cancel(id) {
    const job = jobs.get(String(id ?? ''))
    if (!job) return false
    if (job.status !== 'running') return false
    job.status = 'cancelled'
    job.error = '已取消'
    job.progress = { phase: 'cancelled', pct: 100, message: '已取消' }
    job.finishedAt = nowIso()
    job.controller.abort()
    return true
  }

  /** One job by id. */
  function get(id) {
    const job = jobs.get(String(id ?? ''))
    return job ? publicJob(job) : null
  }

  /** The latest job for a project (running first). */
  function latestFor(projectId) {
    const runningId = activeByProject.get(String(projectId ?? ''))
    if (runningId) {
      const running = jobs.get(runningId)
      if (running) return publicJob(running)
    }
    for (let index = order.length - 1; index >= 0; index -= 1) {
      const job = jobs.get(order[index])
      if (job && job.projectId === projectId) return publicJob(job)
    }
    return null
  }

  /** Recent jobs for one project. */
  function recentFor(projectId, limit = 5) {
    const out = []
    for (let index = order.length - 1; index >= 0 && out.length < limit; index -= 1) {
      const job = jobs.get(order[index])
      if (job && job.projectId === projectId) out.push(publicJob(job))
    }
    return out
  }

  /** Whether a project has a running job. */
  function isBusy(projectId) {
    return activeByProject.has(String(projectId ?? ''))
  }

  /** Slice a job down to its public shape (progress fields only). */
  function publicJob(job) {
    return {
      id: job.id,
      projectId: job.projectId,
      kind: job.kind,
      label: job.label,
      status: job.status,
      startedAt: job.startedAt,
      finishedAt: job.finishedAt,
      progress: job.progress,
      error: job.error,
      result: job.result,
    }
  }

  /** Cancel everything (plugin disposal). */
  function dispose() {
    disposed = true
    for (const job of jobs.values()) {
      if (job.status === 'running') {
        job.status = 'cancelled'
        job.error = '插件已卸载'
        job.finishedAt = nowIso()
        job.controller.abort()
      }
    }
    jobs.clear()
    order.length = 0
    activeByProject.clear()
  }

  return { start, cancel, get, latestFor, recentFor, isBusy, dispose }
}
