import assert from 'node:assert/strict'
import { setImmediate } from 'node:timers/promises'
import { test } from 'node:test'
import { createService } from '../../lib/service.js'

test('project deletion waits for jobs and blocks new work until deletion settles', async () => {
  let deletes = 0
  const removing = Promise.withResolvers()
  const store = { remove: async () => { deletes += 1; return removing.promise } }
  const service = createService({ store, config: {} })
  const running = Promise.withResolvers()
  const job = service.jobs.start({ projectId: 'p' }, () => running.promise)
  await setImmediate()
  const busyDelete = service.deleteProject('p')
  assert.equal(deletes, 0)
  await assert.rejects(busyDelete, { code: 'busy' })
  assert.equal(service.cancelJob(job.id), true)
  await assert.rejects(service.deleteProject('p'), { code: 'busy' })
  assert.equal(deletes, 0)
  running.resolve()
  await setImmediate()

  const deleting = service.deleteProject('p')
  assert.equal(deletes, 1)
  assert.throws(() => service.startStudy('p'), { code: 'busy' })
  assert.throws(() => service.startCheck('p'), { code: 'busy' })
  await assert.rejects(service.deleteProject('p'), { code: 'busy' })
  removing.reject(new Error('temporary failure'))
  await assert.rejects(deleting, /temporary failure/)
  store.remove = async () => true
  assert.deepEqual(await service.deleteProject('p'), { removed: true })
  await service.dispose()
})
