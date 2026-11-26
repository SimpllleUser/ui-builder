import { test } from 'node:test'
import assert from 'node:assert/strict'
import { pickTab } from '../mcp/tabs.mjs'

const tab = (id, loaded, editing = true) => ({ id, loaded, editing })

test('commands go to a tab that edits, the latest loaded among equals', () => {
  assert.equal(pickTab([]), null)
  assert.equal(pickTab([tab('old', 1), tab('new', 2)]).id, 'new')
  assert.equal(pickTab([tab('editor', 1), tab('locked', 2, false)]).id, 'editor')
  assert.equal(pickTab([tab('first', 1, false), tab('second', 2, false)]).id, 'second')
})
