import { test } from 'node:test'
import assert from 'node:assert/strict'
import { nextTick } from 'vue'
import { server, store } from './support.mjs'
import { findChrome, isLocalOrigin } from '../mcp/screenshot.mjs'

const source = async args => {
  const { runMcpCommand } = await server.ssrLoadModule(
    '/src/modules/ui-builder/features/mcp-bridge/model/mcpProjectCommands.ts',
  )
  const host = { refusal: () => null, exportFile: async () => store.exportDocument() }
  return runMcpCommand(store, host, 'screenshot_source', args)
}

test('a screenshot is described by the project, the page and where Preview stands', async () => {
  store.setStateVariable('count', 1)
  store.addPage('Join', '/join')
  const editing = await source({})
  assert.equal(editing.path, '/join')
  assert.equal(editing.state, null)
  assert.equal(JSON.parse(editing.document).pages.length, 2)

  store.startPreview()
  await nextTick()
  store.navigate('/')
  store.runtimeState.count = 5
  const previewing = await source({})
  assert.deepEqual([previewing.path, previewing.state.count], ['/', 5])
  assert.equal((await source({ path: '/join' })).path, '/join')
  await assert.rejects(source({ path: '/nope' }), /No page with path/)
})

test('only an editor on this computer is pictured, with a Chrome that exists', () => {
  assert.ok(isLocalOrigin('http://localhost:3001'))
  assert.ok(isLocalOrigin('http://127.0.0.1'))
  for (const origin of ['https://example.com', 'http://localhost.example.com', undefined])
    assert.equal(isLocalOrigin(origin), false, String(origin))
  assert.equal(
    findChrome({ UI_BUILDER_CHROME: '/my/chrome' }, path => path === '/my/chrome'),
    '/my/chrome',
  )
  assert.throws(() => findChrome({}, () => false), /UI_BUILDER_CHROME/)
})
