import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createPinia } from 'pinia'
import { useStore, store, memoryProject } from './support.mjs'

test('pages: add, route validation, switching, delete and undo', () => {
  const home = store.activePage.id
  store.addComponent('VBtn')
  const orders = store.addPage('Orders')
  assert.equal(orders.path, '/orders')
  assert.equal(store.activePage.id, orders.id)
  assert.equal(store.rootNode.children.length, 0, 'new page starts empty')
  assert.equal(store.addPage('Other', '/orders'), null, 'duplicate route is rejected')
  assert.equal(store.updatePage(orders.id, { path: 'orders' }), false)
  assert.equal(store.updatePage(orders.id, { path: '/orders/list' }), true)
  store.selectPage(home)
  assert.equal(store.rootNode.children.length, 1)
  assert.equal(store.deletePage(orders.id), true)
  assert.equal(store.deletePage(home), false, 'last page stays')
  store.undo()
  assert.equal(store.pages.length, 2, 'deleting a page can be undone')
})

test('shared layout is created with an outlet, edited separately and survives save and reload', async () => {
  const project = memoryProject(store.exportDocument())
  store.openProject(project.opened())
  store.addComponent('VBtn')
  store.editLayout(true)
  assert.equal(store.editingLayout, true)
  const types = []
  const walk = node => {
    types.push(node.type)
    ;[...node.children, ...Object.values(node.slots).flat()].forEach(walk)
  }
  walk(store.rootNode)
  for (const type of ['VApp', 'VAppBar', 'VNavigationDrawer', 'VMain', 'PageOutlet'])
    assert.ok(types.includes(type), type)
  store.editLayout(false)
  assert.equal(store.rootNode.children[0].type, 'VBtn')
  await store.saveDocument()
  const next = useStore(createPinia())
  next.openProject(project.opened())
  assert.ok(next.project.layout)
  next.$dispose()
})

test('pages can be duplicated with fresh ids, reordered, and the last page is remembered', async () => {
  const project = memoryProject(store.exportDocument())
  store.openProject(project.opened())
  store.addComponent('VBtn')
  store.addComponent('VCard', 'root-canvas')
  const home = store.activePage
  const copy = store.duplicatePage(home.id)
  assert.equal(copy.name, 'Home copy')
  assert.deepEqual(
    store.pages.map(page => page.id),
    [home.id, copy.id],
    'copy sits right after the original',
  )
  assert.equal(store.activePage.id, copy.id)
  assert.equal(store.rootNode.id, 'root-canvas')
  assert.equal(store.rootNode.children.length, 2)
  assert.notEqual(store.rootNode.children[0].id, home.root.children[0].id, 'elements get new ids')
  assert.equal(new Set(store.pages.map(page => page.path)).size, 2, 'copy gets its own route')
  assert.equal(store.movePage(copy.id, -1), true)
  assert.deepEqual(
    store.pages.map(page => page.id),
    [copy.id, home.id],
  )
  assert.equal(store.movePage(copy.id, -1), false, 'cannot move past the first tab')
  store.selectPage(home.id)
  await store.saveDocument()
  const next = useStore(createPinia())
  next.openProject(project.opened())
  assert.equal(next.activePage.id, home.id, 'reopening returns to the last page')
  next.$dispose()
  store.deletePage(copy.id)
  assert.equal(store.notice, 'Deleted page “Home copy”.')
  assert.equal(store.noticeUndo, true, 'the message offers Undo')
})
