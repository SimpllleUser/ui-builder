import { test } from 'node:test'
import assert from 'node:assert/strict'
import { guideContent, parseProject, playground, runtime, store } from './support.mjs'

test('bindings, events and state are validated and persisted', () => {
  store.addComponent('VBtn')
  const id = store.selectedNodeId
  store.updateNodeLogic(id, {
    model: 'open',
    vIf: '!loading',
    vFor: 'rows',
    events: { click: { type: 'toggle', key: 'open' } },
  })
  assert.equal(store.setStateVariable('open', false), true)
  assert.equal(store.setStateVariable('__proto__', 1), false)
  const reloaded = parseProject(store.exportDocument())
  const node = reloaded.pages[0].root.children[0]
  assert.deepEqual([node.model, node.vIf, node.vFor, node.events.click.type], ['open', '!loading', 'rows', 'toggle'])
  assert.equal(reloaded.state.open, false)
  store.updateNodeLogic(id, { model: '', events: undefined })
  assert.equal('model' in store.findNodeById(id), false)
  assert.equal('events' in store.findNodeById(id), false)
  const broken = JSON.parse(store.exportDocument())
  broken.pages[0].root.children[0].events = { click: { type: 'eval', code: 'x' } }
  assert.throws(() => parseProject(JSON.stringify(broken)), /Invalid event/)
})

test('runtime resolves bindings, conditions, repeats and masks without evaluating code', () => {
  const scope = { user: { name: 'Anna' }, rows: [1, 2], count: 3, status: 'paid', open: false }
  assert.equal(runtime.interpolate('Hi {{ user.name }}!', scope), 'Hi Anna!')
  assert.deepEqual(runtime.interpolate('{{rows}}', scope), [1, 2])
  assert.equal(runtime.interpolate('{{constructor}}', scope), undefined)
  assert.equal(runtime.resolvePath('user.__proto__', scope), undefined)
  assert.equal(runtime.evaluateCondition('!open', scope), true)
  assert.equal(runtime.evaluateCondition('status == paid', scope), true)
  assert.equal(runtime.evaluateCondition('status != "paid"', scope), false)
  assert.equal(runtime.evaluateCondition('alert(1)', scope), true, 'invalid conditions show the element')
  assert.equal(runtime.evaluateCondition('count >= 3', scope), true)
  assert.equal(runtime.evaluateCondition('count > 3', scope), false)
  assert.equal(runtime.evaluateCondition('user.name == Anna', scope), true)
  assert.equal(runtime.evaluateCondition('count >= 2 and status == "paid"', scope), true)
  assert.equal(runtime.evaluateCondition('count > 5 or not open', scope), true)
  assert.equal(runtime.evaluateCondition('(count > 5 || open) && status == paid', scope), false)
  assert.equal(runtime.evaluateCondition('contains(rows, 2) && length(rows) == 2', scope), true)
  assert.equal(runtime.evaluateCondition('empty(rows) ? open : count == 3', scope), true)
  assert.equal(runtime.evaluateCondition('status == {{status}}', scope), true, 'bindings read as variables')
  assert.equal(runtime.evaluateCondition('user.constructor == 1 || user.__proto__', scope), false)
  assert.equal(runtime.evaluateCondition('rows.push(1)', scope), true, 'method calls are refused, not run')
  assert.deepEqual(scope.rows, [1, 2])
  assert.match(runtime.conditionError('rows.push(1)'), /not available/)
  const row = { id: 7, step: 2 }
  assert.equal(runtime.evaluateCondition('row.step >= 2', { row }), true)
  assert.equal(runtime.evaluateCondition('row.step >= 3', { row }), false)
  assert.deepEqual(runtime.repeatItems('rows', scope), [1, 2])
  assert.equal(runtime.repeatItems('count', scope).length, 3)
  assert.equal(runtime.applyMask('31122026', '##.##.####'), '31.12.2026')
  assert.equal(runtime.applyMask('3112', '##.##.####'), '31.12')
  assert.equal(runtime.applyMask('12ab', '##-AA'), '12-ab')
})

test('preview actions change state and navigate between pages', () => {
  store.addPage('Orders')
  store.selectPage(store.pages[0].id)
  store.setStateVariable('open', false)
  store.isPreviewMode = true
  return Promise.resolve().then(() => {
    assert.equal(store.runtimeState.open, false)
    store.dispatchAction({ type: 'toggle', key: 'open' })
    assert.equal(store.runtimeState.open, true)
    store.dispatchAction({ type: 'set', key: 'count', value: '3' })
    assert.equal(store.runtimeState.count, 3)
    store.dispatchAction({ type: 'navigate', to: '/orders' })
    assert.equal(store.previewPage.path, '/orders')
    store.dispatchAction({ type: 'navigate', to: '/missing' })
    assert.match(store.notice, /No page/)
    assert.equal(store.project.state.open, false, 'preview does not change the saved initial state')
  })
})

test('a click can store a whole table row and conditions can read its fields', () => {
  const row = { id: 1002, customer: 'Ivan', step: 1 }
  const action = runtime.bindAction({ type: 'set', key: 'selected', value: '{{item}}' }, { item: row })
  assert.deepEqual(action.value, row)
  assert.notEqual(action.value, row, 'the stored row is a copy')
  const state = { selected: 'none' }
  runtime.runAction(action, { state, navigate() {} })
  assert.equal(state.selected.customer, 'Ivan')
  const text = runtime.bindAction({ type: 'set', key: 'name', value: '{{item.customer}}' }, { item: row })
  assert.equal(text.value, 'Ivan')
})

test('resetting the preview restores starting values and the page it opened on', () => {
  const home = store.activePage.id
  const orders = store.addPage('Orders')
  store.selectPage(home)
  store.setStateVariable('open', false)
  store.isPreviewMode = true
  return Promise.resolve().then(() => {
    assert.equal(store.previewPage.id, home, 'the preview opens on the page being edited')
    store.dispatchAction({ type: 'toggle', key: 'open' })
    store.dispatchAction({ type: 'set', key: 'extra', value: '7' })
    store.dispatchAction({ type: 'navigate', to: orders.path })
    assert.equal(store.previewPage.id, orders.id)
    assert.equal(store.runtimeState.open, true)
    store.resetPreview()
    assert.equal(store.runtimeState.open, false)
    assert.equal('extra' in store.runtimeState, false, 'variables made during the preview are gone')
    assert.equal(store.previewPage.id, home)
    assert.equal(store.project.state.open, false, 'the saved starting values were never changed')
  })
})

test('the Behavior guide playground answers like Preview and explains what is wrong', () => {
  const { scope } = playground.parseVariables('{"age": 20, "role": "admin", "tags": ["new"]}')
  assert.equal(playground.evaluateSample('age >= 18 and role == "admin"', scope).outcome, 'shown')
  assert.equal(playground.evaluateSample('age < 18 or contains(tags, "old")', scope).outcome, 'hidden')
  const broken = playground.evaluateSample('age >', scope)
  assert.equal(broken.outcome, 'unreadable')
  assert.equal(typeof broken.problem, 'string')
  assert.match(playground.parseVariables('[1, 2]').problem, /JSON object/)
  assert.match(playground.parseVariables('{oops').problem, /JSON object/)
  assert.equal(playground.parseVariables('  ').problem, null)
  assert.equal(guideContent.isGuideSection('conditions'), true)
  assert.equal(guideContent.isGuideSection('nope'), false)
})

test('every example in the Behavior guide is a readable condition', () => {
  const examples = guideContent.GUIDE_SECTIONS.flatMap(section =>
    section.blocks.filter(block => block.kind === guideContent.GuideBlockKind.Example),
  )
  assert.ok(examples.length >= 10)
  for (const { condition, variables } of examples)
    assert.equal(playground.evaluateSample(condition, variables).problem, null, condition)
})
