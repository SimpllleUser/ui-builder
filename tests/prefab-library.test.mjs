import { test, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import { createPinia } from 'pinia'
import { IDBFactory } from 'fake-indexeddb'

let server, useStore, openPrefabRepository, factory, listeners

before(async () => {
  server = await createServer({
    configFile: false,
    server: { middlewareMode: true, watch: null, ws: false },
    optimizeDeps: { noDiscovery: true, include: [] },
    appType: 'custom',
    resolve: {
      alias: { 'vuetify/components': fileURLToPath(new URL('./vuetify-components.stub.mjs', import.meta.url)) },
    },
  })
  const model = '/src/modules/ui-builder/entities/ui-node/'
  ;({ useUiTreeStore: useStore } = await server.ssrLoadModule(`${model}model/store.ts`))
  ;({ openPrefabRepository } = await server.ssrLoadModule(`${model}api/prefabRepository.ts`))
})
beforeEach(() => {
  factory = new IDBFactory()
  listeners = []
})
after(() => server.close())

const channel = () => {
  let own
  return {
    post: () => listeners.filter(listener => listener !== own).forEach(listener => listener()),
    subscribe: listener => {
      own = listener
      listeners.push(listener)
    },
  }
}
const repository = (legacy = null) =>
  openPrefabRepository({ factory, channel: channel(), legacyStorage: { getItem: () => legacy } })
const openTab = async legacy => {
  const store = useStore(createPinia())
  await store.openPrefabLibrary(await repository(legacy))
  return store
}
const save = (store, name) => {
  store.addComponent('VBtn', 'root-canvas')
  store.savePrefab(store.selectedNodeId, name)
}
const names = list => list.map(prefab => prefab.name)
const settle = () => new Promise(resolve => setTimeout(resolve, 30))

test('saved components are written one by one and come back in the order they were saved', async () => {
  const store = await openTab()
  save(store, 'First')
  save(store, 'Second')
  await store.flushPrefabs()
  assert.equal(store.hasUnsavedPrefabs, false)
  assert.deepEqual(names(await (await repository()).list()), ['First', 'Second'])

  store.deletePrefab(store.prefabs[0].prefabId)
  assert.equal(store.hasUnsavedPrefabs, true)
  await store.flushPrefabs()
  assert.deepEqual(names((await openTab()).prefabs), ['Second'])
})

test('an edit of a saved component is stored', async () => {
  const store = await openTab()
  save(store, 'Card')
  store.editPrefab(store.prefabs[0].prefabId)
  store.rootNode.name = 'Renamed element'
  await store.flushPrefabs()
  assert.equal((await openTab()).prefabs[0].node.name, 'Renamed element')
})

test('tabs see each other and do not overwrite what the other saved', async () => {
  const first = await openTab()
  const second = await openTab()
  save(first, 'From first')
  save(second, 'From second')
  await Promise.all([first.flushPrefabs(), second.flushPrefabs()])
  await settle()
  assert.deepEqual(names(first.prefabs).sort(), ['From first', 'From second'])
  assert.deepEqual(names(second.prefabs).sort(), ['From first', 'From second'])

  second.editPrefab(second.prefabs[0].prefabId)
  first.deletePrefab(second.prefabs[0].prefabId)
  await first.flushPrefabs()
  await settle()
  assert.equal(second.prefabs.length, 1)
  assert.equal(second.editingPrefab, null, 'a component removed elsewhere is no longer edited')
})

test('components from localStorage move over once, and broken entries are left out', async () => {
  const node = { id: 'n', type: 'VBtn', name: 'Button', props: {}, classes: [], children: [], slots: {} }
  const legacy = JSON.stringify([{ prefabId: 'a', name: 'Old', node }, { broken: true }])
  const store = await openTab(legacy)
  assert.deepEqual(names(store.prefabs), ['Old'])

  store.deletePrefab('a')
  await store.flushPrefabs()
  assert.deepEqual((await openTab(legacy)).prefabs, [], 'a deleted component does not come back')
})
