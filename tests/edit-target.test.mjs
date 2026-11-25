import { test } from 'node:test'
import assert from 'node:assert/strict'
import { server, store } from './support.mjs'

const load = () => server.ssrLoadModule('/src/modules/ui-builder/entities/ui-node/model/editTarget.ts')

test('leaving a saved component goes back to where it was opened from', async () => {
  const { PAGE_TARGET, LAYOUT_TARGET, openPrefabTarget, leavePrefabTarget, isOnLayout } = await load()
  for (const origin of [PAGE_TARGET, LAYOUT_TARGET]) {
    // Opening a second component keeps the first origin.
    const opened = openPrefabTarget(openPrefabTarget(origin, 'a'), 'b')
    assert.equal(isOnLayout(opened), isOnLayout(origin))
    assert.deepEqual(leavePrefabTarget(opened), origin)
  }
})

test('without a layout nothing points at it', async () => {
  const { PAGE_TARGET, LAYOUT_TARGET, openPrefabTarget, leavePrefabTarget, withoutLayout } = await load()
  assert.deepEqual(withoutLayout(LAYOUT_TARGET), PAGE_TARGET)
  assert.deepEqual(leavePrefabTarget(withoutLayout(openPrefabTarget(LAYOUT_TARGET, 'a'))), PAGE_TARGET)
})

test('a saved component edited from the layout returns to the layout', () => {
  store.addComponent('VBtn')
  store.savePrefab(store.selectedNodeId, 'Button')
  store.editLayout(true)
  const layoutRoot = store.rootNode
  store.editPrefab(store.prefabs[0].prefabId)
  assert.equal(store.rootNode, store.editingPrefab.node)
  store.stopEditingPrefab()
  assert.equal(store.editingLayout, true)
  assert.equal(store.rootNode, layoutRoot)
})
