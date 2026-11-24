import { test } from 'node:test'
import assert from 'node:assert/strict'
import { nextTick, ref } from 'vue'
import { behaviorModel, conditionInsert, nodeModel, store, tabScroll, variableList } from './support.mjs'

test('an element shows what Behavior it has, in the order Preview applies it', () => {
  store.addComponent('VBtn')
  const id = store.selectedNodeId
  assert.deepEqual(behaviorModel.describeBehaviors(store.findNodeById(id)), [])
  assert.deepEqual(behaviorModel.behaviorMarker(store.findNodeById(id)), {})

  store.updateNodeLogic(id, {
    vFor: 'rows',
    vIf: 'item.stock > 0',
    model: 'name',
    events: { click: { type: 'navigate', to: '/home' } },
  })
  const notes = behaviorModel.describeBehaviors(store.findNodeById(id))
  assert.deepEqual(
    notes.map(note => note.badge),
    ['repeat', 'condition', 'link', 'click'],
  )
  assert.equal(notes[0].description, 'Repeats for each item of rows')
  assert.equal(notes[1].description, 'Shown only when item.stock > 0')
  assert.equal(notes[3].description, 'On click: go to /home')
  assert.deepEqual(behaviorModel.behaviorMarker(store.findNodeById(id)), {
    'data-behavior': 'for \u00b7 if \u00b7 link \u00b7 click',
  })
})

test('a blank behavior is not reported and every click action is described', () => {
  store.addComponent('VBtn')
  const id = store.selectedNodeId
  store.updateNodeLogic(id, { vIf: '   ', vFor: '' })
  assert.deepEqual(behaviorModel.describeBehaviors(store.findNodeById(id)), [])
  const describe = click => {
    store.updateNodeLogic(id, { events: { click } })
    return behaviorModel.describeBehaviors(store.findNodeById(id))[0].description
  }
  assert.equal(describe({ type: 'toggle', key: 'open' }), 'On click: switch open on or off')
  assert.equal(describe({ type: 'set', key: 'mode', value: 'dark' }), 'On click: set mode to dark')
})

test('the condition field tells what Preview does at the start, and says nothing when it cannot know', () => {
  const state = { open: false, count: 3 }
  const outcome = text => behaviorModel.startingOutcome(text, state)
  assert.equal(outcome('count >= 3'), 'shown')
  assert.equal(outcome('open'), 'hidden')
  assert.equal(outcome('not open and count > 1'), 'shown')
  assert.equal(outcome(''), null, 'no condition')
  assert.equal(outcome('count >'), null, 'cannot be read')
  assert.equal(outcome('item.stock == 0'), null, 'item exists only inside a repeat')
  assert.equal(outcome('index > 1 or open'), null)
})

test('a condition creates only the variables it really reads, never an operator word or a repeat name', () => {
  const variables = text => behaviorModel.conditionVariables(text)
  assert.deepEqual(variables('not empty(plan) and contains(email, "@")'), ['plan', 'email'])
  assert.deepEqual(variables('status == paid'), ['status'], 'an unquoted word on the right is text')
  assert.deepEqual(variables('item.stock > 0 and open'), ['open'], 'item exists only inside a repeat')
  assert.deepEqual(variables('count >'), [])
  assert.deepEqual(variables(''), [])
})

test('inside a repeat or a table cell the condition may use item, index and value', () => {
  store.addComponent('VCard')
  const outer = store.selectedNodeId
  store.addComponent('VBtn', outer)
  const inner = store.selectedNodeId
  const names = id => behaviorModel.repeatScopeNames(store.findNodeById(id), store.findParentAndIndex)
  assert.deepEqual(names(inner), [])
  store.updateNodeLogic(outer, { vFor: 'rows' })
  assert.deepEqual(names(inner), ['item', 'index'], 'a child of a repeated element')
  assert.deepEqual(names(outer), ['item', 'index'], 'the repeated element itself')
})

test('a clicked suggestion is written where the caret is and never glues words together', () => {
  const variable = conditionInsert.variableSnippet('step', '')
  const empty = conditionInsert.FUNCTION_SNIPPETS.find(snippet => snippet.name === 'empty')
  assert.deepEqual(conditionInsert.insertAtCaret('', 0, 0, variable), { text: 'step', caret: 4 })
  // A half-typed name is completed, not repeated.
  assert.equal(conditionInsert.insertAtCaret('ste', 3, 3, variable).text, 'step')
  // After a finished word a space keeps the two apart; after an operator it does not.
  assert.equal(conditionInsert.insertAtCaret('open', 4, 4, variable).text, 'open step')
  assert.equal(conditionInsert.insertAtCaret('open and ', 9, 9, variable).text, 'open and step')
  // A selection is replaced, and the caret lands inside the brackets of a function.
  assert.equal(conditionInsert.insertAtCaret('a == b', 0, 1, variable).text, 'step == b')
  assert.deepEqual(conditionInsert.insertAtCaret('not ', 4, 4, empty), { text: 'not empty()', caret: 10 })
  assert.equal(conditionInsert.insertAtCaret('x', 0, 0, variable).text, 'step x', 'text after the caret is kept apart')
})

test('the Variables panel lists every variable with its kind and every place that uses it', () => {
  store.setStateVariable('open', false)
  store.setStateVariable('rows', [{ name: 'a' }])
  store.setStateVariable('unused', 'x')
  store.addComponent('VBtn')
  const button = store.selectedNodeId
  store.updateNodeLogic(button, {
    vIf: 'open and not empty(rows)',
    events: { click: { type: 'toggle', key: 'open' } },
  })
  store.addComponent('VCard')
  store.updateNodeLogic(store.selectedNodeId, { vFor: 'rows' })

  const usages = behaviorModel.findVariableUsages(store.project)
  const rows = variableList.buildVariableRows(store.project.state, usages)
  const byName = Object.fromEntries(rows.map(row => [row.name, row]))
  assert.equal(byName.open.type, 'yes-no')
  assert.equal(byName.rows.type, 'list')
  assert.equal(byName.unused.elementCount, 0)
  assert.equal(byName.open.elementCount, 1, 'one element uses it twice but counts once')
  assert.deepEqual(byName.open.usages.map(usage => usage.kind).sort(), ['click', 'condition'])
  assert.equal(byName.rows.elementCount, 2, 'a condition and a repeat on two elements')
  assert.equal(byName.open.usages[0].pageName, store.activePage.name)
  assert.equal(variableList.countLabel(0), 'Not used')
  assert.equal(variableList.countLabel(1), 'Used in 1 element')
  assert.equal(variableList.countLabel(3), 'Used in 3 elements')
  assert.equal(variableList.variableTypeOf(null), 'nothing')
  assert.equal(variableList.formatVariableValue('text'), 'text')
  assert.equal(variableList.formatVariableValue([1]), '[1]')
})

test('deleting a variable can be undone from the message that appears', () => {
  store.setStateVariable('gone', 1)
  store.removeStateVariable('gone')
  assert.equal('gone' in store.project.state, false)
  assert.equal(store.noticeUndo, true)
  store.undo()
  assert.equal(store.project.state.gone, 1)
})

test('an empty page or container is recognised, including one whose content is only in a named slot', () => {
  assert.equal(nodeModel.isNodeEmpty(store.rootNode), true, 'a new page has nothing on it')
  store.addComponent('VCard')
  assert.equal(nodeModel.isNodeEmpty(store.rootNode), false)
  assert.equal(nodeModel.isNodeEmpty({ children: [], slots: { title: [] } }), true)
  assert.equal(nodeModel.isNodeEmpty({ children: [], slots: { title: [{ id: 'x' }] } }), false)
})

test('Preview explains each hidden element by the variables its condition reads and what they hold now', () => {
  const state = { step: 1, role: 'guest', rows: [1, 2] }
  const hidden = [
    { id: 'a', name: 'Step 2', condition: 'step == 2' },
    { id: 'b', name: 'Admin badge', condition: 'role == "admin" and step >= 1' },
    { id: 'c', name: 'Out of stock', condition: 'item.stock == 0' },
    { id: 'c', name: 'Out of stock', condition: 'item.stock == 0' },
    { id: 'd', name: 'Broken', condition: 'step >' },
  ]
  const explained = behaviorModel.explainHiddenElements(hidden, state)
  assert.equal(explained.length, 4, 'one entry per element, not per copy')
  assert.deepEqual(explained[0].reads, [{ name: 'step', value: '1' }])
  assert.deepEqual(explained[1].reads, [
    { name: 'role', value: '"guest"' },
    { name: 'step', value: '1' },
  ])
  assert.equal(explained[2].copies, 2)
  assert.equal(explained[2].dependsOnRepeat, true)
  assert.deepEqual(explained[2].reads, [], 'item differs per copy, so it is not listed')
  assert.deepEqual(explained[3].reads, [], 'an unreadable condition reads nothing')
  assert.equal(behaviorModel.valueToText('x'), '"x"')
  assert.equal(behaviorModel.valueToText(undefined), 'undefined')
  assert.equal(behaviorModel.valueToText('a'.repeat(200)).length, 80)
})

test('a scrolling panel remembers where it was in each tab and starts from the top for another element', async () => {
  const panel = ref({ scrollTop: 0 })
  const tab = ref('style')
  const element = ref('a')
  tabScroll.useTabScroll(panel, tab, element)

  panel.value.scrollTop = 240
  tab.value = 'behavior'
  await nextTick()
  await nextTick()
  assert.equal(panel.value.scrollTop, 0, 'a tab visited for the first time starts at the top')
  panel.value.scrollTop = 80
  tab.value = 'style'
  await nextTick()
  await nextTick()
  assert.equal(panel.value.scrollTop, 240, 'back in the first tab where it was left')
  tab.value = 'behavior'
  await nextTick()
  await nextTick()
  assert.equal(panel.value.scrollTop, 80)

  element.value = 'b'
  await nextTick()
  assert.equal(panel.value.scrollTop, 0, 'another element starts from the top')
  tab.value = 'style'
  await nextTick()
  await nextTick()
  assert.equal(panel.value.scrollTop, 0, 'and forgets the earlier positions')
})
