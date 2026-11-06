import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import vm from 'node:vm'

/** Evaluate client.js in a browser-like sandbox and return its module definition. */
function loadClient() {
  const source = readFileSync(new URL('../../client.js', import.meta.url), 'utf8')
  let definition = null
  const sandbox = {
    window: {
      __ModuleLoader__: {
        load(next) {
          definition = next
        },
      },
      localStorage: { getItem: () => null, setItem: () => {} },
    },
    console,
    Symbol,
    Object,
    JSON,
    Math,
    Date,
    Array,
    String,
    Number,
    Boolean,
    RegExp,
    Error,
    Promise,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    parseInt,
    parseFloat,
    isNaN,
  }
  vm.createContext(sandbox)
  vm.runInContext(source, sandbox, { filename: 'client.js' })
  return definition
}

/** A fake React module good enough to construct elements. */
function fakeReact() {
  const element = (type, props, ...children) => ({ type, props: props || {}, children })
  return {
    createElement: element,
    useState: (initial) => [typeof initial === 'function' ? initial() : initial, () => {}],
    useEffect: () => {},
    useRef: () => ({ current: null }),
    useCallback: (fn) => fn,
    useMemo: (fn) => fn(),
  }
}

test('client module registers under the package id', () => {
  const definition = loadClient()
  assert.equal(definition.id, 'dsh-site-rebuild')
  assert.equal(typeof definition.factory, 'function')
})

test('client exposes inject, apply and slot registrations', () => {
  const definition = loadClient()
  const module = definition.factory((name) => {
    assert.equal(name, 'react')
    return fakeReact()
  })
  assert.deepEqual([...module.inject], ['slots', 'locale'])
  assert.equal(typeof module.apply, 'function')
  const registrations = []
  const ctx = {
    effect: (fn) => fn(),
    locale: {
      register: (namespace, dictionaries) => {
        registrations.push({ kind: 'locale', namespace, dictionaries })
        return () => {}
      },
      bind: () => (key) => key,
    },
    slots: {
      inject: (name, factory) => {
        registrations.push({ kind: 'inject', name })
        return factory()
      },
      register: (options, component) => {
        registrations.push({ kind: 'register', options, component })
        return () => {}
      },
    },
  }
  module.apply(ctx)
  const locale = registrations.find((row) => row.kind === 'locale')
  assert.equal(locale.namespace, 'dsh-site-rebuild')
  assert.ok(locale.dictionaries.zh)
  assert.ok(locale.dictionaries.en)
  const registrationsList = registrations.filter((row) => row.kind === 'register')
  assert.equal(registrationsList.length, 2)
  assert.equal(registrationsList[0].options.name, 'sidebar.panellist')
  assert.equal(registrationsList[1].options.name, 'main')
  assert.equal(registrationsList[1].options.key, 'dsh-site-rebuild')
  for (const registration of registrationsList) assert.equal(typeof registration.component, 'function')
})

test('locale dictionaries have identical keys and the helpers work', () => {
  const definition = loadClient()
  const module = definition.factory(() => fakeReact())
  const { DICTIONARIES, makeT, fmtDuration, fmtBytes, statusMeta, stepState } = module.__test__
  const zhKeys = Object.keys(DICTIONARIES.zh).sort()
  const enKeys = Object.keys(DICTIONARIES.en).sort()
  assert.deepEqual(zhKeys, enKeys)
  assert.equal(makeT('zh')('panel'), '网站复刻')
  assert.equal(makeT('en')('panel'), 'Site')
  assert.equal(makeT('zh')('round', { n: 3 }), '第 3 轮')
  assert.equal(makeT('en')('pagesCount', { n: 2 }), '2 pages')
  assert.equal(fmtDuration(1500), '1.5 s')
  assert.equal(fmtBytes(2048), '2.0 KB')
  assert.equal(statusMeta('ready', makeT('zh')).tone, 'ok')
  assert.equal(stepState({ study: { state: 'done' } }, 'study'), 'done')
  assert.equal(stepState({}, 'study'), 'pending')
})
