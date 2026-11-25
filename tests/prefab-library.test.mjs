import { test, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import { createPinia } from 'pinia'
import { IDBFactory } from 'fake-indexeddb'

let server, useStore, openPrefabRepository, factory, listeners, held
const locks = {
  tryAcquire: async name => {
    if (held.has(name)) return null
    held.add(name)
    return { release: () => held.delete(name) }
  },
}

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
  held = new Set()
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
  openPrefabRepository({
    factory,
    channel: channel(),
    locks,
    legacyStorage: { getItem: () => legacy, removeItem: () => {} },
  })
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

test('a component is edited in one tab at a time', async () => {
  const first = await openTab()
  save(first, 'Card')
  await first.flushPrefabs()
  const second = await openTab()
  const [{ prefabId }] = second.prefabs

  first.editPrefab(prefabId)
  await settle()
  second.editPrefab(prefabId)
  await settle()
  assert.equal(second.editingPrefab, null)
  assert.match(second.notice, /“Card” is being edited in another tab/)

  first.stopEditingPrefab()
  await settle()
  second.editPrefab(prefabId)
  await settle()
  assert.equal(second.editingPrefab.prefabId, prefabId)
})

test('the old library key is removed after it was moved', async () => {
  let value = '[]'
  await openPrefabRepository({
    factory,
    channel: channel(),
    locks,
    legacyStorage: { getItem: () => value, removeItem: () => (value = null) },
  })
  assert.equal(value, null)
})

const variantOf = store => store.rootNode.props.variant
const changeVariant = (store, variant) => {
  store.updateNodeProp(store.rootNode.id, 'variant', variant)
  store.commit()
}
/** Opens the component and waits until the tab holds it and has read its history. */
const edit = async (store, prefabId) => {
  store.editPrefab(prefabId)
  await settle()
}
const leave = async store => {
  store.stopEditingPrefab()
  await store.flushPrefabs()
  await settle()
}

test('the history of a component survives closing the app', async () => {
  const first = await openTab()
  save(first, 'Card')
  const [{ prefabId }] = first.prefabs
  await edit(first, prefabId)
  changeVariant(first, 'tonal')
  await leave(first)

  const reopened = await openTab()
  await edit(reopened, prefabId)
  assert.equal(reopened.historyVersions.length, 2)
  reopened.undo()
  assert.equal(variantOf(reopened), undefined)
  await leave(reopened)

  const again = await openTab()
  await edit(again, prefabId)
  assert.equal(variantOf(again), undefined)
  again.redo()
  assert.equal(variantOf(again), 'tonal', 'where the history stood is stored too')
})

test('tabs share the history of a component', async () => {
  const first = await openTab()
  save(first, 'Card')
  await first.flushPrefabs()
  const second = await openTab()
  const [{ prefabId }] = second.prefabs

  await edit(first, prefabId)
  changeVariant(first, 'tonal')
  await leave(first)
  await edit(second, prefabId)
  changeVariant(second, 'outlined')
  await leave(second)

  await edit(first, prefabId)
  assert.equal(first.historyVersions.length, 3)
  first.undo()
  assert.equal(variantOf(first), 'tonal', 'the step of the other tab is taken back as a step')
  first.undo()
  assert.equal(variantOf(first), undefined)
})

test('a deleted component comes back with its history, and removing it clears what was stored', async () => {
  const store = await openTab()
  save(store, 'Card')
  const [{ prefabId }] = store.prefabs
  await edit(store, prefabId)
  changeVariant(store, 'tonal')
  await leave(store)

  store.deletePrefab(prefabId)
  await store.flushPrefabs()
  assert.equal(await (await repository()).readHistory(prefabId), null)

  store.undo()
  await store.flushPrefabs()
  const reopened = await openTab()
  assert.deepEqual(names(reopened.prefabs), ['Card'])
  await edit(reopened, prefabId)
  assert.equal(reopened.historyVersions.length, 2)
  reopened.undo()
  assert.equal(variantOf(reopened), undefined)
})

test('a component deleted without being opened since the app started keeps its history', async () => {
  const first = await openTab()
  save(first, 'Card')
  const [{ prefabId }] = first.prefabs
  await edit(first, prefabId)
  changeVariant(first, 'tonal')
  await leave(first)

  const store = await openTab()
  store.deletePrefab(prefabId)
  await store.flushPrefabs()
  store.undo()
  await settle()
  await store.flushPrefabs()

  const reopened = await openTab()
  await edit(reopened, prefabId)
  assert.equal(reopened.historyVersions.length, 2)
})

test('deleted components can be restored after closing the app, to their place and with their history', async () => {
  const first = await openTab()
  save(first, 'First')
  save(first, 'Second')
  const [{ prefabId }] = first.prefabs
  await edit(first, prefabId)
  changeVariant(first, 'tonal')
  await leave(first)
  first.deletePrefab(prefabId)
  await first.flushPrefabs()

  const reopened = await openTab()
  assert.deepEqual(
    reopened.deletedPrefabs.map(entry => entry.prefab.name),
    ['First'],
  )
  assert.equal(reopened.restorePrefab(prefabId), true)
  await reopened.flushPrefabs()

  const again = await openTab()
  assert.deepEqual(names(again.prefabs), ['First', 'Second'])
  assert.deepEqual(again.deletedPrefabs, [])
  await edit(again, prefabId)
  assert.equal(again.historyVersions.length, 2)
})

test('another tab sees what was deleted, and only the latest deletions are kept', async () => {
  const first = await openTab()
  const second = await openTab()
  for (let index = 0; index < 12; index++) save(first, `Card ${index}`)
  await first.flushPrefabs()
  for (const { prefabId } of [...first.prefabs]) {
    first.deletePrefab(prefabId)
    await first.flushPrefabs()
    await new Promise(resolve => setTimeout(resolve, 2))
  }
  await settle()
  assert.equal(second.deletedPrefabs.length, 10)
  assert.equal(second.deletedPrefabs[0].prefab.name, 'Card 11')
  assert.equal((await openTab()).deletedPrefabs.length, 10)
})
