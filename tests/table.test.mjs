import { test } from 'node:test'
import assert from 'node:assert/strict'
import { server, parseProject, store } from './support.mjs'

test('new Vuetify components are registered and survive import', () => {
  const types = [
    'VApp',
    'VMain',
    'VAppBar',
    'VNavigationDrawer',
    'VDataTable',
    'VPagination',
    'VDialog',
    'VMenu',
    'VSnackbar',
    'VTooltip',
    'VDatePicker',
    'VBreadcrumbs',
    'VStepper',
    'VTimeline',
    'VBtnToggle',
    'VSkeletonLoader',
  ]
  for (const type of types) store.addComponent(type, 'root-canvas')
  const project = parseProject(store.exportDocument())
  assert.deepEqual(
    project.pages[0].root.children.map(node => node.type),
    types,
  )
  const table = store.rootNode.children.find(node => node.type === 'VDataTable')
  assert.ok(Array.isArray(table.props.items) && Array.isArray(table.props.headers))
  assert.equal(store.rootNode.children.find(node => node.type === 'VTimeline').children.length, 2)
})

test('data table cell slots follow its columns and survive export', () => {
  store.addComponent('VDataTable')
  const id = store.selectedNodeId
  const table = store.findNodeById(id)
  assert.equal(store.appendToSlot(id, 'item.status', store.createNode('VBtn')), true)
  assert.equal(store.appendToSlot(id, 'item.missing', store.createNode('VBtn')), false)
  const reloaded = parseProject(store.exportDocument()).pages[0].root.children[0]
  assert.equal(reloaded.slots['item.status'].length, 1)
  table.props.headers = table.props.headers.filter(header => header.key !== 'status')
  assert.deepEqual(
    parseProject(store.exportDocument()).pages[0].root.children[0].slots,
    {},
    'content of a removed column is dropped on load',
  )
})

test('table columns and rows can be edited by the editor and through MCP', async () => {
  const { executeMcpCommand } = await server.ssrLoadModule(
    '/src/modules/ui-builder/features/mcp-bridge/model/mcpCommands.ts',
  )
  const { id } = executeMcpCommand(store, 'add_component', { type: 'VDataTable' })
  const added = executeMcpCommand(store, 'add_table_column', {
    id,
    key: 'total',
    title: 'Total',
    align: 'end',
    width: 120,
  })
  assert.equal(added.columns.at(-1).width, 120)
  assert.throws(() => executeMcpCommand(store, 'add_table_column', { id, key: 'total' }), /already uses/)
  executeMcpCommand(store, 'add_table_row', { id, values: { id: 1004, customer: 'Petro', total: 25 } })
  executeMcpCommand(store, 'add_component', { type: 'VBtn', parentId: id, slot: 'item.total', text: 'Pay' })
  // Renaming a key keeps row data and cell content.
  executeMcpCommand(store, 'update_table_column', { id, column: 'total', key: 'amount' })
  const table = executeMcpCommand(store, 'get_table', { id })
  assert.equal(table.rows.at(-1).amount, 25)
  assert.equal('total' in table.rows.at(-1), false)
  assert.equal(table.cellContent.amount.length, 1)
  executeMcpCommand(store, 'update_table_row', { id, index: 0, values: { customer: 'Maria' } })
  assert.equal(executeMcpCommand(store, 'get_table', { id }).rows[0].customer, 'Maria')
  executeMcpCommand(store, 'remove_table_row', { id, index: 0 })
  executeMcpCommand(store, 'remove_table_column', { id, column: 'amount' })
  const after = executeMcpCommand(store, 'get_table', { id })
  assert.equal(
    after.columns.some(column => column.key === 'amount'),
    false,
  )
  assert.deepEqual(store.findNodeById(id).slots, {})
  assert.throws(() => executeMcpCommand(store, 'remove_table_row', { id, index: 99 }), /No row/)
  executeMcpCommand(store, 'update_node', { id, props: { striped: true, headerColor: 'primary', density: 'compact' } })
  assert.equal(executeMcpCommand(store, 'get_table', { id }).settings.striped, true)
  // Tables fed from state refuse manual edits instead of overwriting the binding.
  executeMcpCommand(store, 'update_node', { id, props: { items: '{{orders}}' } })
  assert.throws(() => executeMcpCommand(store, 'add_table_row', { id }), /state/)
  assert.ok(
    executeMcpCommand(store, 'describe_component', { type: 'VDataTable' }).props.some(
      field => field.prop === 'headerColor',
    ),
  )
  store.undo()
})

test('table settings are grouped, most used first, and rarely needed groups start collapsed', async () => {
  const { COMPONENT_DEFS } = await server.ssrLoadModule(
    '/src/modules/ui-builder/entities/ui-node/model/componentDefinitions.ts',
  )
  const sections = COMPONENT_DEFS.VDataTable.propertySections
  const titles = sections.map(section => section.title)
  assert.deepEqual(titles.slice(0, 5), ['Data', 'Look', 'Behavior', 'Size & scrolling', 'Texts'])
  assert.equal(sections.find(section => section.title === 'Look').collapsed, undefined, 'the main look group is open')
  for (const title of ['Behavior', 'Size & scrolling', 'Texts']) {
    assert.equal(sections.find(section => section.title === title).collapsed, true, title)
  }
  // Grouping must not lose any setting.
  const props = sections.flatMap(section => section.fields).flatMap(field => ('prop' in field ? [field.prop] : []))
  for (const prop of [
    'density',
    'striped',
    'hover',
    'bordered',
    'headerColor',
    'showSelect',
    'multiSort',
    'loading',
    'hideDefaultFooter',
    'height',
    'fixedHeader',
    'fixedFooter',
    'noDataText',
    'loadingText',
    'search',
    'itemsPerPage',
  ]) {
    assert.ok(props.includes(prop), prop)
  }
  assert.equal(new Set(props).size, props.length, 'no setting appears twice')
})

test('a table bound to a variable shows its list, or an empty table when there is none', async () => {
  const { resolveTableData } = await server.ssrLoadModule(
    '/src/modules/ui-builder/entities/ui-node/model/tableBindings.ts',
  )
  const state = { orders: [{ id: 1 }], notAList: 'text' }
  assert.deepEqual(resolveTableData({ items: '{{orders}}' }, state), { items: [{ id: 1 }] })
  assert.deepEqual(
    resolveTableData({ items: '{{missing}}' }, state),
    { items: [] },
    'an unknown variable is an empty list',
  )
  assert.deepEqual(resolveTableData({ items: '{{notAList}}' }, state), { items: [] }, 'so is one that is not a list')
  assert.deepEqual(resolveTableData({ headers: '{{orders}}', items: '{{orders}}' }, state), {
    headers: [{ id: 1 }],
    items: [{ id: 1 }],
  })
  assert.deepEqual(resolveTableData({ headers: [{ key: 'a' }], items: [] }, state), {}, 'real lists are left alone')
})
