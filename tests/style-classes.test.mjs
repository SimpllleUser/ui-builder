import { test } from 'node:test'
import assert from 'node:assert/strict'
import { exportTargets, parseProject, server, store } from './support.mjs'

const load = name => server.ssrLoadModule(`/src/modules/ui-builder/entities/ui-node/model/${name}.ts`)

const addStyled = style => {
  store.addComponent('div')
  const id = store.selectedNodeId
  if (style) store.updateNodeStyle(id, style)
  store.commit()
  return id
}

test('saving a style as a class moves it there, and other elements can use it', async () => {
  const { sharedStyleOf, styleClassSheet } = await load('styleClasses')
  const first = addStyled({ padding: '8px', color: 'red' })
  assert.equal(store.createStyleClass(first, 'card'), null)
  assert.equal(store.findNodeById(first).props.style, undefined)
  assert.ok(store.findNodeById(first).classes.includes('ui-s-card'))

  const second = addStyled()
  assert.ok(store.applyStyleClass(second, 'card'))
  assert.equal(sharedStyleOf(store.findNodeById(second), store.project.styleClasses).color, 'red !important')
  assert.match(styleClassSheet(store.project.styleClasses), /html \.ui-s-card \{\n {2}padding: 8px !important;/)
  assert.deepEqual(parseProject(store.exportDocument()).styleClasses, store.project.styleClasses)
})

test('a class is updated from an element, and deleting it takes it off every element; both can be undone', () => {
  const id = addStyled({ color: 'red' })
  store.createStyleClass(id, 'accent')
  store.updateNodeStyle(id, { color: 'blue' })
  store.commit()
  assert.ok(store.updateStyleClass(id, 'accent'))
  assert.equal(store.project.styleClasses.accent.color, 'blue !important')

  assert.ok(store.deleteStyleClass('accent'))
  assert.equal(store.project.styleClasses, undefined)
  assert.ok(!store.findNodeById(id).classes.includes('ui-s-accent'))
  store.undo()
  assert.ok(store.findNodeById(id).classes.includes('ui-s-accent'))
  assert.ok(store.project.styleClasses.accent)
})

test('a class needs a free, plain name and a style to hold', () => {
  const id = addStyled({ color: 'red' })
  assert.match(store.createStyleClass(id, 'Bad name'), /small letters/)
  assert.equal(store.createStyleClass(id, 'accent'), null)
  assert.match(store.createStyleClass(id, 'accent'), /already exists/)
  assert.match(store.createStyleClass(id, 'other'), /no style of its own/)
  const document = JSON.parse(store.exportDocument())
  document.styleClasses = { accent: { color: 'red; } body { display: none' } }
  assert.throws(() => parseProject(JSON.stringify(document)), /style class/)
})

test('exported code carries the rules of the classes it uses', () => {
  const id = addStyled({ color: 'red' })
  store.createStyleClass(id, 'accent')
  const [{ code }] = exportTargets.buildExportTargets(store.project, []).map(target => target.file)
  assert.match(code, /class="[^"]*ui-s-accent/)
  assert.match(code, /<style>\nhtml \.ui-s-accent \{\n {2}color: red !important;/)
})

test('Vuetify classes that a style overrides are reported by property', async () => {
  const { overriddenUtilities, StyleSource } = await load('utilityOverlap')
  const found = overriddenUtilities(
    ['pa-4', 'mt-md-2', 'rounded-lg', 'text-h4', 'text-center', 'bg-primary', 'd-flex'],
    { paddingTop: '1px', textAlign: 'left' },
    { borderRadius: '2px', color: 'red' },
  )
  assert.deepEqual(
    found.map(item => [item.className, item.properties.length, item.sources]),
    [
      ['pa-4', 1, [StyleSource.Element]],
      ['rounded-lg', 4, [StyleSource.SharedClass]],
      ['text-center', 1, [StyleSource.Element]],
      ['bg-primary', 1, [StyleSource.SharedClass]],
    ],
  )
})
