import assert from 'node:assert/strict'
import { setImmediate } from 'node:timers/promises'
import { test } from 'node:test'
import { createJobs } from '../../lib/jobs.js'

function pendingJob(jobs) {
  const release = Promise.withResolvers()
  const started = Promise.withResolvers()
  const job = jobs.start({ projectId: 'project', timeoutMs: 5000 }, ({ signal }) => {
    started.resolve(signal)
    return release.promise
  })
  return { job, started: started.promise, release }
}

test('cancel aborts immediately and keeps the project busy until late work settles', async () => {
  const jobs = createJobs()
  const { job, started, release } = pendingJob(jobs)
  const signal = await started
  assert.equal(jobs.cancel(job.id), true)
  assert.equal(signal.aborted, true)
  assert.throws(() => pendingJob(jobs), { code: 'busy' })
  release.resolve('late success')
  await setImmediate()
  assert.equal(jobs.get(job.id).status, 'cancelled')
  assert.equal(jobs.get(job.id).result, null)
  assert.equal(jobs.isBusy('project'), false)
  jobs.dispose()
})

test('timeout keeps the project busy and rejects late progress and success', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const jobs = createJobs()
  const { job, started, release } = pendingJob(jobs)
  const signal = await started
  t.mock.timers.tick(5000)
  assert.equal(signal.aborted, true)
  assert.equal(jobs.get(job.id).progress.phase, 'timeout')
  assert.throws(() => pendingJob(jobs), { code: 'busy' })
  release.reject(new Error('late failure'))
  await setImmediate()
  assert.equal(jobs.get(job.id).progress.phase, 'timeout')
  assert.equal(jobs.isBusy('project'), false)
  jobs.dispose()
})

test('dispose aborts running work and prevents queued callbacks and new jobs', async () => {
  const jobs = createJobs()
  const { started, release } = pendingJob(jobs)
  const signal = await started
  let queuedRan = false
  jobs.start({ projectId: 'queued' }, () => { queuedRan = true })
  jobs.dispose()
  assert.equal(signal.aborted, true)
  assert.throws(() => pendingJob(jobs), /disposed/)
  release.resolve()
  await setImmediate()
  assert.equal(queuedRan, false)
})
