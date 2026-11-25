import { test } from 'node:test'
import assert from 'node:assert/strict'
import { server, memoryProject, parseProject, store } from './support.mjs'

const lastChild = () => store.rootNode.children.at(-1)

/** Saves a card with a title parameter and inserts one instance of it. */
function saveAndInsert(values) {
  store.addComponent('VCard', 'root-canvas')
  const source = lastChild()
  source.children = [{ ...store.createNode('VBtn'), name: 'Action' }]
  source.children[0].children[0].name = '{{props.title}}'
  store.savePrefab(source.id, 'Promo', { title: 'Buy' })
  store.deleteNode(source.id)
  const [prefab] = store.prefabs
  store.insertPrefab(prefab.prefabId, 'root-canvas', null, values)
  return prefab
}
const textOf = instance => instance.children[0].children[0].name
/** Changes the original the way the component editor does. */
function editOriginal(prefab, change) {
  store.editPrefab(prefab.prefabId)
  change(store.rootNode)
  store.stopEditingPrefab()
}

test('instances follow their original, each with its own parameters', () => {
  const prefab = saveAndInsert()
  store.insertPrefab(prefab.prefabId, 'root-canvas', null, { title: 'Order' })
  const [first, second] = store.rootNode.children
  assert.deepEqual([first.instance.prefabId, first.instance.values], [prefab.prefabId, {}])
  assert.deepEqual([textOf(first), textOf(second)], ['Buy', 'Order'])

  editOriginal(prefab, node => {
    node.props.variant = 'tonal'
  })
  assert.deepEqual(
    store.rootNode.children.map(node => node.props.variant),
    ['tonal', 'tonal'],
  )
  assert.deepEqual(store.rootNode.children.map(textOf), ['Buy', 'Order'])
  assert.equal(store.rootNode.children[1].id, second.id, 'an instance keeps its id and name')
  assert.equal(store.rootNode.children[1].name, second.name)
})

test('only chosen parameters stay when the default changes', () => {
  const prefab = saveAndInsert()
  store.insertPrefab(prefab.prefabId, 'root-canvas', null, { title: 'Order' })
  store.prefabs[0].props = [{ name: 'title', defaultValue: 'Start' }]
  assert.deepEqual(store.rootNode.children.map(textOf), ['Start', 'Order'])

  assert.ok(store.setInstanceProps(store.rootNode.children[0].id, { title: 'Go' }))
  assert.equal(textOf(store.rootNode.children[0]), 'Go')
})

test('what is inside an instance cannot be changed, and a click there selects the instance', () => {
  saveAndInsert()
  const instance = lastChild()
  const inner = instance.children[0]
  store.selectNode(inner.id)
  assert.equal(store.selectedNodeId, instance.id)

  assert.equal(store.updateNodeProp(inner.id, 'color', 'error'), false)
  assert.equal(store.updateNodeStyle(instance.id, { color: 'red' }), false)
  assert.equal(store.updateNodeLogic(instance.id, { vIf: 'open' }), false)
  assert.equal(store.deleteNode(inner.id), false)
  assert.equal(store.duplicateNode(inner.id), undefined)
  assert.equal(store.canContain(instance), false)
  assert.equal(store.unwrapNode(instance.id), false)
  assert.equal(inner.props.color, undefined)

  store.addComponent('VBtn')
  assert.equal(store.rootNode.children.length, 2, 'new elements go next to the instance')
  assert.ok(store.renameNode(instance.id, 'Hero'))
  assert.ok(store.deleteNode(instance.id))
})

test('a detached instance is an ordinary copy', () => {
  const prefab = saveAndInsert()
  const instance = lastChild()
  assert.ok(store.detachInstance(instance.id))
  editOriginal(prefab, node => {
    node.props.variant = 'tonal'
  })
  assert.equal(lastChild().props.variant, undefined)
  assert.ok(store.updateNodeProp(lastChild().children[0].id, 'color', 'error'))
})

test('an instance whose original was deleted can be edited again', () => {
  const prefab = saveAndInsert()
  store.deletePrefab(prefab.prefabId)
  const inner = lastChild().children[0]
  assert.ok(store.updateNodeProp(inner.id, 'color', 'error'))
})

test('a copy of an instance is an instance with ids of its own', () => {
  const prefab = saveAndInsert()
  const instance = lastChild()
  const copy = store.findNodeById(store.duplicateNode(instance.id))
  assert.notEqual(copy.children[0].id, instance.children[0].id)
  assert.ok(copy.children[0].id.startsWith(`${copy.id}--`))
  assert.equal(copy.instance.prefabId, prefab.prefabId)
})

test('undo and redo keep instances as their originals are now', () => {
  const prefab = saveAndInsert()
  store.commit()
  store.addComponent('VBtn', 'root-canvas')
  editOriginal(prefab, node => {
    node.props.variant = 'tonal'
  })
  store.undo()
  assert.equal(store.rootNode.children.length, 1)
  assert.equal(store.rootNode.children[0].props.variant, 'tonal')
  assert.equal(store.canRedo, true, 'following the original is not a new edit')
  store.redo()
  assert.equal(store.rootNode.children.length, 2)
})

test('a project opened later takes the originals as they are now', () => {
  const prefab = saveAndInsert()
  const saved = store.exportDocument()
  const other = memoryProject(store.exportDocument())
  store.deleteNode(lastChild().id)
  editOriginal(prefab, node => {
    node.props.variant = 'tonal'
  })
  assert.equal(parseProject(saved).pages[0].root.children[0].instance.prefabId, prefab.prefabId)
  store.openProject(other.opened())
  assert.equal(lastChild().props.variant, 'tonal')
  assert.equal(store.canUndo, false)
})

test('components nest and cannot contain themselves', () => {
  const inner = saveAndInsert()
  store.addComponent('VCard', 'root-canvas')
  const wrapper = lastChild()
  wrapper.children = []
  store.insertPrefab(inner.prefabId, wrapper.id)
  store.savePrefab(wrapper.id, 'Section')
  const outer = store.prefabs[1]
  store.insertPrefab(outer.prefabId, 'root-canvas')

  editOriginal(inner, node => {
    node.props.variant = 'tonal'
  })
  assert.equal(lastChild().children[0].props.variant, 'tonal')

  store.editPrefab(inner.prefabId)
  assert.equal(store.insertPrefab(inner.prefabId, store.rootNode.id), false)
  assert.equal(store.insertPrefab(outer.prefabId, store.rootNode.id), false)
  assert.match(store.notice, /cannot contain itself/)
})

test('a document with a broken instance link is refused', () => {
  saveAndInsert()
  const document = JSON.parse(store.exportDocument())
  document.pages[0].root.children[0].instance = { prefabId: 1 }
  assert.throws(() => parseProject(JSON.stringify(document)), /Invalid component instance/)
})

test('agents are told that an instance is locked and can change its parameters', async () => {
  const { executeMcpCommand } = await server.ssrLoadModule(
    '/src/modules/ui-builder/features/mcp-bridge/model/mcpCommands.ts',
  )
  const run = (command, args) => executeMcpCommand(store, command, args)
  saveAndInsert()
  const { id } = lastChild()
  assert.equal(run('get_node', { id }).instance.prefabId, store.prefabs[0].prefabId)
  for (const [command, args] of [
    ['update_node', { id, props: { color: 'error' } }],
    ['set_style', { id, style: { color: 'error' } }],
    ['set_binding', { id, vIf: 'open' }],
  ])
    assert.throws(() => run(command, args), /component instance/, command)

  run('update_instance', { id, props: { title: 'Pay' } })
  assert.equal(textOf(lastChild()), 'Pay')
  run('detach_instance', { id })
  assert.equal(lastChild().instance, undefined)
})

test('the component editor has its own undo, and instances follow it', () => {
  const prefab = saveAndInsert()
  store.commit()
  store.editPrefab(prefab.prefabId)
  assert.equal(store.canUndo, false)
  store.updateNodeProp(store.rootNode.id, 'variant', 'tonal')
  assert.equal(store.canUndo, true)

  store.undo()
  assert.equal(store.rootNode.props.variant, undefined)
  assert.equal(store.project.pages[0].root.children[0].props.variant, undefined)
  store.redo()
  assert.equal(store.project.pages[0].root.children[0].props.variant, 'tonal')

  store.stopEditingPrefab()
  assert.equal(lastChild().props.variant, 'tonal', 'the page history is untouched by the component one')
  store.undo()
  assert.equal(store.rootNode.children.length, 0, 'undo on the page takes back the page step')
  store.redo()

  store.editPrefab(prefab.prefabId)
  store.undo()
  assert.equal(store.rootNode.props.variant, undefined, 'the history is still there after leaving the editor')
  store.stopEditingPrefab()
  assert.equal(lastChild().props.variant, undefined)
})

test('undo in the component editor brings back deleted elements and parameter defaults', () => {
  const prefab = saveAndInsert()
  store.editPrefab(prefab.prefabId)
  store.deleteNode(store.rootNode.children[0].id)
  assert.deepEqual(store.editingPrefab.props, [])
  assert.match(store.notice, /^Deleted/)
  store.undo()
  assert.equal(store.rootNode.children.length, 1)
  assert.deepEqual(store.editingPrefab.props, [{ name: 'title', defaultValue: 'Buy' }])
  store.stopEditingPrefab()
  assert.equal(textOf(lastChild()), 'Buy')
})

test('a change made elsewhere becomes a step of its own, and the older steps stay', () => {
  const prefab = saveAndInsert()
  store.editPrefab(prefab.prefabId)
  store.updateNodeProp(store.rootNode.id, 'variant', 'tonal')
  store.stopEditingPrefab()
  store.prefabs[0].node.props.variant = 'outlined'
  store.editPrefab(prefab.prefabId)
  assert.equal(store.historyVersions.at(-1).label, 'Changed outside the editor')
  store.undo()
  assert.equal(store.rootNode.props.variant, 'tonal')
  store.undo()
  assert.equal(store.rootNode.props.variant, undefined)
})

test('Undo brings back a deleted component, and its instances follow it again', () => {
  const prefab = saveAndInsert()
  store.commit()
  store.deletePrefab(prefab.prefabId)
  assert.equal(store.noticeUndo, true)
  assert.equal(store.canUndo, true)
  assert.equal(store.isLocked(lastChild().id), false)

  store.undo()
  assert.deepEqual(
    store.prefabs.map(item => item.name),
    ['Promo'],
  )
  assert.equal(store.isLocked(lastChild().id), true)
  assert.equal(store.rootNode.children.length, 1, 'no page step was taken back with it')
})

test('after a new edit, Undo takes that back and leaves the component deleted', () => {
  const prefab = saveAndInsert()
  store.commit()
  store.deletePrefab(prefab.prefabId)
  store.addComponent('VBtn', 'root-canvas')
  store.undo()
  assert.equal(store.rootNode.children.length, 1)
  assert.equal(store.prefabs.length, 0)
})

test('history shows the steps of the component being edited, to agents too', async () => {
  const { executeMcpCommand } = await server.ssrLoadModule(
    '/src/modules/ui-builder/features/mcp-bridge/model/mcpCommands.ts',
  )
  const prefab = saveAndInsert()
  store.commit()
  const pageSteps = store.historyVersions.length
  store.editPrefab(prefab.prefabId)
  store.updateNodeProp(store.rootNode.id, 'variant', 'tonal')
  store.commit()
  const history = executeMcpCommand(store, 'get_history')
  assert.deepEqual(history.scope, { component: prefab.prefabId, name: 'Promo' })
  assert.equal(history.versions.length, 2)
  executeMcpCommand(store, 'restore_version', { index: 0 })
  assert.equal(store.rootNode.props.variant, undefined)

  store.stopEditingPrefab()
  assert.equal(executeMcpCommand(store, 'get_history').scope, 'project')
  assert.equal(store.historyVersions.length, pageSteps)
})

test('a failed group of changes is put back in the component too', () => {
  const prefab = saveAndInsert()
  store.editPrefab(prefab.prefabId)
  assert.throws(() =>
    store.transaction(() => {
      store.updateNodeProp(store.rootNode.id, 'variant', 'tonal')
      throw new Error('stop')
    }),
  )
  assert.equal(store.rootNode.props.variant, undefined)
  assert.equal(store.canUndo, false)
})

test('Redo deletes the restored component again', () => {
  const prefab = saveAndInsert()
  store.commit()
  store.deletePrefab(prefab.prefabId)
  store.undo()
  assert.equal(store.canRedo, true)
  store.redo()
  assert.equal(store.prefabs.length, 0)
  store.undo()
  assert.equal(store.prefabs.length, 1)
})

test('a component can be restored after other edits, and a copy edited meanwhile stays a copy', () => {
  const prefab = saveAndInsert()
  store.insertPrefab(prefab.prefabId, 'root-canvas')
  const [edited, untouched] = store.rootNode.children
  store.deletePrefab(prefab.prefabId)
  store.updateNodeProp(edited.id, 'color', 'error')
  store.renameNode(untouched.id, 'Renamed')
  store.commit()

  assert.equal(store.restorePrefab(prefab.prefabId), true)
  assert.equal(store.deletedPrefabs.length, 0)
  const [first, second] = store.rootNode.children
  assert.equal(first.props.color, 'error', 'the edit is not overwritten')
  assert.equal(first.instance, undefined)
  assert.equal(second.instance.prefabId, prefab.prefabId, 'a renamed copy is still the same content')
  assert.equal(second.name, 'Renamed')
})
