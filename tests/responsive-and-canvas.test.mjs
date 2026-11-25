import { test } from 'node:test'
import assert from 'node:assert/strict'
import { codegen, drag, grid, measure, parseProject, responsive, store } from './support.mjs'

const addStyled = () => {
  store.addComponent('div')
  const id = store.selectedNodeId
  store.updateNodeStyle(id, { width: '100px', color: 'red' })
  store.commit()
  store.editingBreakpoint = 'md'
  store.updateNodeStyle(id, { width: '300px' })
  return id
}

test('a style set for a breakpoint applies from it up, and removing it inherits again', () => {
  const id = addStyled()
  const node = store.findNodeById(id)
  const widthAt = breakpoint => responsive.effectiveStyle(node, breakpoint).width
  assert.equal(widthAt(null), '100px !important')
  assert.equal(widthAt('sm'), '100px !important')
  assert.equal(widthAt('md'), '300px !important')
  assert.equal(widthAt('xl'), '300px !important')
  store.updateNodeStyle(id, { width: null })
  assert.equal(node.responsive, undefined)
  assert.equal(widthAt('md'), '100px !important')
})

test('xs and "all sizes" write the style of the element itself', () => {
  store.addComponent('div')
  store.editingBreakpoint = 'xs'
  store.updateNodeStyle(store.selectedNodeId, { width: '10px' })
  const node = store.findNodeById(store.selectedNodeId)
  assert.deepEqual(node.props.style, { width: '10px !important' })
  assert.equal(node.responsive, undefined)
})

test('overrides are saved, undone, reset and validated', () => {
  const id = addStyled()
  store.commit()
  assert.ok(parseProject(store.exportDocument()))
  assert.ok(store.historyVersions.some(version => version.label.startsWith('Changed the style')))
  store.resetNodeOverrides(id)
  assert.equal(store.findNodeById(id).responsive, undefined)
  store.undo()
  assert.ok(store.findNodeById(id).responsive.md)
  for (const bad of [{ xxl: {} }, { md: { width: '1px } body { color: red' } }, { md: { 'a b': '1' } }]) {
    const document = JSON.parse(store.exportDocument())
    document.pages[0].root.children[0].responsive = bad
    assert.throws(() => parseProject(JSON.stringify(document)), /responsive/)
  }
})

test('exported code moves the style into min-width media queries of the Vuetify breakpoints', () => {
  addStyled()
  const { code } = codegen.exportPage(store.activePage, store.project.state, 'Home.vue')
  const [, className] = code.match(/(ui-r-\w+)/)
  assert.doesNotMatch(code, /style="|:style=/)
  assert.ok(code.includes(`.${className}.${className} {\n  width: 100px !important;`))
  assert.match(code, /@media \(min-width: 960px\) \{[^}]*width: 300px !important;/)
})

test('bound base values stay inline, since only the element can fill them in', () => {
  const rules = responsive.responsiveRules({
    props: { style: { color: '{{ tone }}', width: '1px' } },
    responsive: { sm: { width: '2px' } },
  })
  assert.deepEqual(rules.inlineStyle, { color: '{{ tone }}' })
  assert.doesNotMatch(rules.css, /tone/)
})

test('the canvas shows the grid props in effect on a breakpoint', () => {
  const props = { cols: 12, md: 4, offsetLg: 2, color: 'x' }
  assert.deepEqual(grid.gridPropsAt(props, 'sm'), { cols: 12, color: 'x' })
  assert.deepEqual(grid.gridPropsAt(props, 'xl'), { cols: 4, offset: 2, color: 'x' })
})

test('a width change goes to the edited breakpoint, or to the one in effect on the window', () => {
  const props = { cols: 12, md: 4 }
  assert.equal(grid.columnPropFor(props, 'lg', 500), 'lg')
  assert.equal(grid.columnPropFor(props, 'xs', 1400), 'cols')
  assert.equal(grid.columnPropFor(props, null, 1400), 'md')
  assert.equal(grid.columnPropFor(props, null, 700), 'cols')
  assert.equal(grid.columnsForWidth(260, 1200), 3)
  assert.equal(grid.columnsForWidth(5000, 1200), 12)
  assert.equal(grid.columnsForWidth(1, 1200), 1)
})

const box = (left, top, width, height) => ({ left, top, width, height })

test('distances inside a container are measured to its four sides, apart elements by their gaps', () => {
  const inside = measure.measureBetween(box(10, 20, 30, 40), box(0, 0, 100, 100))
  assert.deepEqual(
    inside.map(item => item.length),
    [10, 60, 20, 40],
  )
  const apart = measure.measureBetween(box(0, 0, 10, 10), box(25, 40, 10, 10))
  assert.deepEqual(
    apart.map(item => item.length),
    [15, 30],
  )
  assert.deepEqual(measure.measureBetween(box(0, 0, 10, 10), box(5, 5, 10, 10)), [])
})

test('dragging changes sizes and padding, in steps of ten with Shift', () => {
  const start = { width: 100, height: 50, paddingTop: 4, paddingRight: 4, paddingBottom: 4, paddingLeft: 4 }
  assert.deepEqual(drag.dragValues('corner', start, 20, -10), { width: 120, height: 40 })
  assert.deepEqual(drag.dragValues('paddingRight', start, -6, 0), { paddingRight: 10 })
  assert.deepEqual(drag.dragValues('paddingTop', start, 0, -50), { paddingTop: 0 })
  assert.deepEqual(drag.dragValues('width', start, 23, 0, true), { width: 120 })
  assert.deepEqual(drag.dragValues('height', start, 30, 0), {})
})

test('a whole drag is one undo step', () => {
  store.addComponent('div')
  const id = store.selectedNodeId
  const versions = store.historyVersions.length
  const end = store.startGesture()
  for (const width of [10, 20, 30]) {
    store.updateNodeStyle(id, { width: `${width}px` })
    store.commit()
  }
  end()
  end()
  assert.equal(store.historyVersions.length, versions + 1)
  store.undo()
  assert.equal(store.findNodeById(id).props.style, undefined)
})
