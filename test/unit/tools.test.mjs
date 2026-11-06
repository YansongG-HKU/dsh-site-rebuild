import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createTools } from '../../lib/tools.js'

/** A fake service with a job that is already finished. */
function fakeService(overrides = {}) {
  const calls = []
  const service = {
    calls,
    jobs: {
      get: (id) => {
        calls.push({ name: 'jobs.get', args: [id] })
        return { id, status: 'done', result: { summary: { pages: [{ path: '', title: 'x', widthData: [{ width: 1440, pageW: 1440, pageH: 900, type: { h1: 44 } }] }], breakpoints: [900], tokenCounts: { backgrounds: 3 } }, evidenceCount: 7, durationMs: 1200, limitations: [] } }
      },
      latestFor: () => null,
      recentFor: () => [],
      cancel: () => true,
    },
    createProject: async (input) => {
      calls.push({ name: 'createProject', args: [input] })
      return { id: 'craft-new', target: { url: input.url }, mode: input.mode, status: 'studied' }
    },
    projectDetail: async (id) => {
      calls.push({ name: 'projectDetail', args: [id] })
      return { project: { id, target: { url: 'https://example.com/' }, mode: 'clean', status: 'studied' }, evidence: { total: 3 }, checks: [], capture: { widths: [1440], pages: [] } }
    },
    startStudy: (id, options) => {
      calls.push({ name: 'startStudy', args: [id, options] })
      return { id: 'job-study' }
    },
    startCheck: (id, options) => {
      calls.push({ name: 'startCheck', args: [id, options] })
      return { id: 'job-check' }
    },
    brief: async (id) => {
      calls.push({ name: 'brief', args: [id] })
      return { markdown: '# brief\n', bytes: 8, truncated: false }
    },
    evidence: async (id, options) => {
      calls.push({ name: 'evidence', args: [id, options] })
      return { total: 1, offset: 0, limit: 8, returned: 1, kinds: ['target'], summary: { count: 1 }, records: [{ id: 'ev-1', kind: 'target', title: 't', summary: 's', confidence: 0.98, confidenceLabel: 'measured', coverage: [], limitations: [], locations: [] }] }
    },
    preview: async (id) => {
      calls.push({ name: 'preview', args: [id] })
      return { url: 'http://127.0.0.1:5000/' }
    },
    listProjects: async () => [
      { id: 'craft-a', name: 'A', url: 'https://a/', mode: 'clean', status: 'studied', lastScore: null, bestScore: null, steps: {}, pageCount: 1, widths: [1440], updatedAt: 'now' },
    ],
    deleteProject: async (id) => {
      calls.push({ name: 'deleteProject', args: [id] })
      return { removed: true }
    },
    ...overrides,
  }
  // The check tool reads the settled job result.
  const originalGet = service.jobs.get
  service.jobs.get = (id) => {
    const job = originalGet(id)
    if (id === 'job-check') {
      return {
        id,
        status: 'done',
        result: {
          round: 1,
          score: 93.5,
          grade: 'A',
          durationMs: 4321,
          perPage: [{ page: '/', score: 93.5, perWidth: [{ width: 1440, score: 93.5, layout: 95, detail: 93, token: 90, regions: [{ x: 1, y: 2, w: 3, h: 4, delta: 0.2 }], pixelDiff: { ratio: 0.01 }, heights: { original: 900, built: 900 } }] }],
          claims: [{ title: 'ok', passed: true }, { title: 'bad', passed: false, detail: 'x' }],
          unknowns: [],
          artifacts: ['checks/round-1/diff-1440.png'],
          notes: ['/：93.5 分'],
        },
      }
    }
    return job
  }
  return service
}

const config = { maxPages: 3 }

test('exposes the six workflow tools with schemas', () => {
  const tools = createTools({ service: fakeService(), config })
  assert.deepEqual(tools.map((tool) => tool.name), ['craft_study', 'craft_brief', 'craft_check', 'craft_projects', 'craft_evidence', 'craft_serve'])
  for (const tool of tools) {
    assert.equal(typeof tool.description, 'string')
    assert.ok(tool.description.length > 40)
    assert.equal(tool.parameters.type, 'object')
    assert.equal(typeof tool.execute, 'function')
    assert.equal(typeof tool.output.render, 'function')
  }
})

test('craft_study creates a project, starts a study and summarises it', async () => {
  const service = fakeService()
  const tools = createTools({ service, config })
  const study = tools.find((tool) => tool.name === 'craft_study')
  const result = await study.execute({ url: 'https://example.com/', request: '复刻', mode: 'deep', stack: 'React', width: [1280, 375], maxPages: 1 })
  assert.equal(result.ok, true)
  assert.equal(result.projectId, 'craft-new')
  assert.equal(result.pages[0].path, '/')
  assert.equal(result.breakpoints[0], 900)
  assert.equal(result.evidenceCount, 7)
  const created = service.calls.find((call) => call.name === 'createProject')
  assert.deepEqual(created.args[0], { url: 'https://example.com/', request: '复刻', mode: 'deep', stack: 'React', name: '' })
  const started = service.calls.find((call) => call.name === 'startStudy')
  assert.deepEqual(started.args[0], 'craft-new')
  assert.deepEqual(started.args[1], { widths: [1280, 375], maxPages: 1 })
})

test('craft_study without a url or project id fails with a repair hint', async () => {
  const tools = createTools({ service: fakeService(), config })
  const study = tools.find((tool) => tool.name === 'craft_study')
  const result = await study.execute({})
  assert.equal(result.ok, false)
  assert.equal(result.code, 'invalid_input')
  assert.ok(result.repair)
})

test('craft_brief returns bounded markdown', async () => {
  const tools = createTools({ service: fakeService(), config })
  const result = await tools.find((tool) => tool.name === 'craft_brief').execute({ projectId: 'craft-a' })
  assert.equal(result.ok, true)
  assert.equal(result.markdown, '# brief\n')
  assert.match(result.file, /BRIEF\.md/u)
})

test('craft_check reports score, widths, failed claims and top regions', async () => {
  const tools = createTools({ service: fakeService(), config })
  const result = await tools.find((tool) => tool.name === 'craft_check').execute({ projectId: 'craft-a' })
  assert.equal(result.ok, true)
  assert.equal(result.score, 93.5)
  assert.equal(result.grade, 'A')
  assert.equal(result.pages[0].widths[0].token, 90)
  assert.equal(result.failedClaims.length, 1)
  assert.equal(result.topRegions.length, 1)
  assert.match(result.next, /close enough/u)
})

test('craft_projects list/get/delete', async () => {
  const service = fakeService()
  const tools = createTools({ service, config })
  const projects = tools.find((tool) => tool.name === 'craft_projects')
  const list = await projects.execute({ action: 'list' })
  assert.equal(list.ok, true)
  assert.equal(list.projects.length, 1)
  const get = await projects.execute({ action: 'get', projectId: 'craft-a' })
  assert.equal(get.ok, true)
  assert.equal(get.project.id, 'craft-a')
  const del = await projects.execute({ action: 'delete', projectId: 'craft-a' })
  assert.equal(del.removed, true)
  const bad = await projects.execute({ action: 'nope' })
  assert.equal(bad.ok, false)
})

test('craft_evidence pages records', async () => {
  const tools = createTools({ service: fakeService(), config })
  const result = await tools.find((tool) => tool.name === 'craft_evidence').execute({ projectId: 'craft-a', limit: 1 })
  assert.equal(result.ok, true)
  assert.equal(result.total, 1)
  assert.equal(result.records[0].id, 'ev-1')
})

test('craft_serve returns a preview URL', async () => {
  const tools = createTools({ service: fakeService(), config })
  const result = await tools.find((tool) => tool.name === 'craft_serve').execute({ projectId: 'craft-a' })
  assert.equal(result.ok, true)
  assert.match(result.url, /^http:\/\/127\.0\.0\.1:/u)
})

test('a service failure becomes a structured failure, not a throw', async () => {
  const service = fakeService({
    brief: async () => {
      throw Object.assign(new Error('the capture files are missing'), { code: 'not_ready', repair: { action: 'restudy', label: 'Study again', detail: 'run craft_study' } })
    },
  })
  const tools = createTools({ service, config })
  const result = await tools.find((tool) => tool.name === 'craft_brief').execute({ projectId: 'craft-a' })
  assert.equal(result.ok, false)
  assert.equal(result.code, 'not_ready')
  assert.equal(result.repair.action, 'restudy')
})
