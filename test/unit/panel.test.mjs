import assert from 'node:assert/strict'
import { test } from 'node:test'
import { Readable } from 'node:stream'
import { checkLoopbackHost, checkRequestGate, dispatch, fileCandidates, matchRoute, readJsonBody, sendJson, statusForCode } from '../../lib/panel.js'

/** A fake web server with an origin. */
const webServer = { getOrigin: () => 'http://127.0.0.1:3080' }

/** A request-like object with headers. */
function req(headers, method = 'GET') {
  return { headers, method }
}

/** A fake service that records calls and returns fixed values. */
function fakeService() {
  const calls = []
  const record = (name, value) => (...args) => {
    calls.push({ name, args })
    return Promise.resolve(value)
  }
  const service = {
    calls,
    overview: () => ({ version: '0.2.0', browser: { available: true }, dataDir: 'C:/data', config: {} }),
    listProjects: record('listProjects', [{ id: 'craft-a' }]),
    createProject: record('createProject', { id: 'craft-b', name: 'B' }),
    projectDetail: record('projectDetail', { project: { id: 'craft-a' }, capture: null, evidence: { total: 0 }, checks: [] }),
    startStudy: (id) => {
      calls.push({ name: 'startStudy', args: [id] })
      return { id: 'job-1', status: 'running' }
    },
    startCheck: (id, options) => {
      calls.push({ name: 'startCheck', args: [id, options] })
      return { id: 'job-2', status: 'running' }
    },
    deleteProject: record('deleteProject', { removed: true }),
    renameProject: record('renameProject', { id: 'craft-a', name: 'renamed' }),
    jobs: { latestFor: () => ({ id: 'job-1', status: 'done' }), recentFor: () => [] },
    evidence: record('evidence', { records: [] }),
    brief: record('brief', { markdown: '# brief', bytes: 7, truncated: false }),
    preview: record('preview', { url: 'http://127.0.0.1:5555/' }),
    openFolder: record('openFolder', { opened: true }),
    cancelJob: () => true,
    diagnostics: record('diagnostics', { version: '0.2.0' }),
    store: { statFile: async () => null },
  }
  return service
}

test('same-origin gate accepts loopback requests with the marker', () => {
  assert.equal(checkRequestGate(webServer, req({ host: '127.0.0.1:3080', 'x-dsh-site-rebuild': '1', origin: 'http://127.0.0.1:3080' })).ok, true)
  assert.equal(checkRequestGate(webServer, req({ host: 'localhost:3080', 'x-dsh-site-rebuild': '1' })).ok, true)
  assert.equal(checkRequestGate(webServer, req({ host: '127.0.0.1:3080', 'x-dsh-site-rebuild': '1', origin: 'http://127.0.0.1:9999' })).ok, false)
  assert.equal(checkRequestGate(webServer, req({ host: 'evil.example:3080', 'x-dsh-site-rebuild': '1' })).ok, false)
  assert.equal(checkRequestGate(webServer, req({ host: '127.0.0.1:3080' })).ok, false)
})

test('image file requests need only a loopback host', () => {
  assert.equal(checkLoopbackHost(req({ host: '127.0.0.1:60393' })), true)
  assert.equal(checkLoopbackHost(req({ host: 'localhost:60393' })), true)
  assert.equal(checkLoopbackHost(req({ host: 'evil.example:60393' })), false)
  assert.equal(checkLoopbackHost(req({})), false)
})

test('file candidates fall back to the capture folder for legacy names', () => {
  assert.deepEqual(fileCandidates('screenshot-1440.png'), ['screenshot-1440.png', 'capture/screenshot-1440.png'])
  assert.deepEqual(fileCandidates('noise-375.png'), ['noise-375.png', 'capture/noise-375.png'])
  assert.deepEqual(fileCandidates('routes/work/screenshot-768.png'), ['routes/work/screenshot-768.png', 'capture/routes/work/screenshot-768.png'])
  assert.deepEqual(fileCandidates('capture/screenshot-1440.png'), ['capture/screenshot-1440.png'])
  assert.deepEqual(fileCandidates('checks/round-1/diff-1440.png'), ['checks/round-1/diff-1440.png'])
  assert.deepEqual(fileCandidates(''), [])
  assert.deepEqual(fileCandidates(undefined), [])
})

test('routes match and decode ids', () => {
  const match = matchRoute('/dsh-site-rebuild/api/projects/craft-abc/study')
  assert.equal(match.descriptor.route, 'study')
  assert.equal(match.params[0], 'craft-abc')
  assert.equal(matchRoute('/dsh-site-rebuild/api/state').descriptor.route, 'state')
  assert.equal(matchRoute('/dsh-site-rebuild/api/nope'), null)
})

test('GET routes dispatch to the service', async () => {
  const service = fakeService()
  const state = await dispatch({ service, match: matchRoute('/dsh-site-rebuild/api/state'), url: new URL('http://x/dsh-site-rebuild/api/state'), body: {}, method: 'GET' })
  assert.equal(state.ok, true)
  assert.equal(state.data.version, '0.2.0')
  const projects = await dispatch({ service, match: matchRoute('/dsh-site-rebuild/api/projects'), url: new URL('http://x/dsh-site-rebuild/api/projects'), body: {}, method: 'GET' })
  assert.equal(projects.projects.length, 1)
  const detail = await dispatch({ service, match: matchRoute('/dsh-site-rebuild/api/projects/craft-a'), url: new URL('http://x/dsh-site-rebuild/api/projects/craft-a'), body: {}, method: 'GET' })
  assert.equal(detail.data.project.id, 'craft-a')
})

test('POST routes create projects and start jobs', async () => {
  const service = fakeService()
  const created = await dispatch({ service, match: matchRoute('/dsh-site-rebuild/api/projects'), url: new URL('http://x/dsh-site-rebuild/api/projects'), body: { url: 'https://example.com', request: '复刻', mode: 'deep' }, method: 'POST' })
  assert.equal(created.project.id, 'craft-b')
  assert.equal(service.calls.find((call) => call.name === 'createProject').args[0].mode, 'deep')
  const study = await dispatch({ service, match: matchRoute('/dsh-site-rebuild/api/projects/craft-a/study'), url: new URL('http://x/dsh-site-rebuild/api/projects/craft-a/study'), body: {}, method: 'POST' })
  assert.equal(study.job.id, 'job-1')
  const check = await dispatch({ service, match: matchRoute('/dsh-site-rebuild/api/projects/craft-a/check'), url: new URL('http://x/dsh-site-rebuild/api/projects/craft-a/check'), body: { url: 'http://127.0.0.1:9000' }, method: 'POST' })
  assert.equal(check.job.id, 'job-2')
  assert.equal(service.calls.find((call) => call.name === 'startCheck').args[1].url, 'http://127.0.0.1:9000')
})

test('readJsonBody bounds and parses bodies', async () => {
  assert.deepEqual(await readJsonBody(Readable.from([])), {})
  assert.deepEqual(await readJsonBody(Readable.from([Buffer.from('{"a":1}')])), { a: 1 })
  await assert.rejects(() => readJsonBody(Readable.from([Buffer.from('{bad')])), /valid JSON/u)
  await assert.rejects(() => readJsonBody(Readable.from([Buffer.alloc(20)]), 10), /exceeds/u)
})

test('status codes map the shared failure codes', () => {
  assert.equal(statusForCode('invalid_input'), 400)
  assert.equal(statusForCode('not_found'), 404)
  assert.equal(statusForCode('busy'), 409)
  assert.equal(statusForCode('not_ready'), 503)
  assert.equal(statusForCode('timeout'), 504)
  assert.equal(statusForCode('weird'), 500)
})

test('sendJson writes one JSON response', () => {
  const captured = {}
  const res = {
    headersSent: false,
    writableEnded: false,
    writeHead(status, headers) {
      captured.status = status
      captured.headers = headers
    },
    end(body) {
      captured.body = body
    },
  }
  sendJson(res, 200, { ok: true })
  assert.equal(captured.status, 200)
  assert.equal(captured.headers['content-type'], 'application/json; charset=utf-8')
  assert.equal(JSON.parse(captured.body).ok, true)
})
