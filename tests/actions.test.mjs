import { test } from 'node:test'
import assert from 'node:assert/strict'
import { actions } from './support.mjs'

const DEFAULTS = { path: '/', variable: 'open' }

test('every kind of action can be created, stored, read from an agent and described', () => {
  for (const type of ['navigate', 'set', 'toggle']) {
    const action = actions.createAction(type, DEFAULTS)
    assert.equal(actions.isValidAction(action), true, type)
    assert.deepEqual(actions.actionFromInput(action), action, type)
    assert.ok(actions.describeAction(action), type)
    assert.ok(actions.actionToCode(action, { helpers: new Set(), usage: { router: false } }), type)
  }
})

test('an incomplete or unknown action is refused', () => {
  for (const input of [{ type: 'navigate' }, { type: 'set' }, { type: 'toggle' }, { type: 'jump' }, {}]) {
    assert.equal(actions.isValidAction(input), false, JSON.stringify(input))
    assert.equal(actions.actionFromInput(input), null, JSON.stringify(input))
  }
})

test('a stored set action needs its value, one from an agent may leave it out', () => {
  assert.equal(actions.isValidAction({ type: 'set', key: 'a' }), false)
  assert.deepEqual(actions.actionFromInput({ type: 'set', key: 'a' }), { type: 'set', key: 'a', value: '' })
})
