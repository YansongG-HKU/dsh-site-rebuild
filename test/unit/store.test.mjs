import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createStore } from '../../lib/store.js'
import { writeJsonAtomic } from '../../lib/util.js'

/** A temporary store. */
async function makeStore() {
  const dir = await mkdtemp(join(tmpdir(), 'craft-store-test-'))
  const store = await createStore({ dir }).init()
  return { dir, store, cleanup: () => rm(dir, { recursive: true, force: true }) }
}

test('creates, lists, reads, updates and deletes a project', async () => {
  const { store, cleanup } = await makeStore()
  try {
    const project = await store.create({ url: 'https://example.com/a', request: '复刻首页', name: '示例' })
    assert.match(project.id, /^craft-/u)
    assert.equal(project.name, '示例')
    assert.equal(project.target.origin, 'https://example.com')
    assert.equal(project.status, 'draft')

    const listed = await store.list()
    assert.equal(listed.length, 1)
    assert.equal(listed[0].id, project.id)

    const loaded = await store.get(project.id)
    assert.equal(loaded.target.url, 'https://example.com/a')

    const updated = await store.update(project.id, (current) => {
      current.status = 'studied'
      current.bestScore = 91
    })
    assert.equal(updated.status, 'studied')
    assert.equal((await store.get(project.id)).bestScore, 91)

    assert.equal(await store.remove(project.id), true)
    assert.equal(await store.get(project.id), null)
    assert.equal((await store.list()).length, 0)
  } finally {
    await cleanup()
  }
})

test('rejects invalid input and unknown ids', async () => {
  const { store, cleanup } = await makeStore()
  try {
    await assert.rejects(() => store.create({ url: 'not-a-url' }), /valid URL/u)
    await assert.rejects(() => store.create({ url: 'ftp://example.com' }), /http/u)
    assert.equal(await store.get('../etc'), null)
    await assert.rejects(() => store.update('craft-missing', () => {}), /does not exist/u)
  } finally {
    await cleanup()
  }
})

test('safe file resolution stays inside the project root', async () => {
  const { store, cleanup } = await makeStore()
  try {
    const project = await store.create({ url: 'https://example.com/', request: '' })
    const paths = store.paths(project.id)
    await writeFile(join(paths.capture, 'a.txt'), 'hello')
    const inside = store.safeFile(project.id, 'capture/a.txt')
    assert.ok(inside.endsWith('a.txt'))
    assert.equal(store.safeFile(project.id, '../craft.json'), null)
    assert.equal(store.safeFile(project.id, '..\\craft.json'), null)
    const content = await store.readFile(project.id, 'capture/a.txt')
    assert.equal(content.toString(), 'hello')
    const stat = await store.statFile(project.id, 'capture/a.txt')
    assert.equal(stat.size, 5)
    assert.equal(await store.statFile(project.id, 'capture/missing.txt'), null)
  } finally {
    await cleanup()
  }
})

test('a corrupt record is ignored instead of breaking the list', async () => {
  const { store, dir, cleanup } = await makeStore()
  try {
    const project = await store.create({ url: 'https://example.com/', request: '' })
    const recordPath = join(dir, 'projects', project.id, 'craft.json')
    await writeFile(recordPath, '{ broken json')
    assert.deepEqual(await store.list(), [])
    assert.equal(await store.get(project.id), null)
    await writeFile(recordPath, JSON.stringify({ schemaVersion: 99, id: project.id }))
    assert.equal(await store.get(project.id), null)
  } finally {
    await cleanup()
  }
})

test('atomic JSON writes replace the previous file', async () => {
  const { dir, cleanup } = await makeStore()
  try {
    const path = join(dir, 'x.json')
    await writeJsonAtomic(path, { value: 1 })
    await writeJsonAtomic(path, { value: 2 })
    assert.deepEqual(JSON.parse(await readFile(path, 'utf8')), { value: 2 })
  } finally {
    await cleanup()
  }
})

test('concurrent updates are serialised', async () => {
  const { store, cleanup } = await makeStore()
  try {
    const project = await store.create({ url: 'https://example.com/', request: '' })
    await Promise.all(
      Array.from({ length: 10 }, (_, index) =>
        store.update(project.id, async (current) => {
          const previous = current.history.length
          await new Promise((resolve) => setTimeout(resolve, 2))
          current.history.push({ at: String(index), previous })
        }),
      ),
    )
    const loaded = await store.get(project.id)
    assert.equal(loaded.history.length, 10)
  } finally {
    await cleanup()
  }
})
