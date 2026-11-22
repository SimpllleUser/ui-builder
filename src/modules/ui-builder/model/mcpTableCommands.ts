import { COMPONENT_DEFS, cellSlotName, type PropField } from '../entities/ui-node/model/componentDefinitions'
import { tableColumns, tableRows } from '../entities/ui-node/model/tableMutations'
import { need, ok, summarize, type McpCommand, type Store } from './mcpCommandUtils'

/** Settings of a component as an AI client needs them: prop name, kind and allowed values. */
function describeFields(type: string) {
  const fields: Array<{ prop: string; kind: string; label: string; options?: string[]; min?: number; max?: number }> =
    []
  for (const section of COMPONENT_DEFS[type]?.propertySections ?? []) {
    for (const field of section.fields as PropField[]) {
      if ('prop' in field) {
        fields.push({
          prop: field.prop,
          kind: field.kind,
          label: field.label,
          ...('options' in field ? { options: field.options } : {}),
          ...('min' in field ? { min: field.min, max: field.max } : {}),
        })
      }
    }
  }
  return fields
}

const needTable = (store: Store, id: unknown) => {
  const node = need(store, id)
  if (node.type !== 'VDataTable') throw new Error(`${node.name} is not a data table`)
  return node
}

const tableState = (store: Store, id: string) => {
  const node = needTable(store, id)
  return { id, columns: tableColumns(node), rows: tableRows(node) }
}

export const MCP_TABLE_COMMANDS: Record<string, McpCommand> = {
  describe_component(_store, a) {
    const def = COMPONENT_DEFS[a.type]
    if (!def) throw new Error(`Unknown component type: ${String(a.type)}`)
    return {
      type: def.type,
      label: def.label,
      isLeaf: !!def.isLeaf,
      slots: def.slots.map(slot => slot.name),
      defaultProps: def.defaultProps,
      props: describeFields(def.type),
      note: 'Set props with update_node. Spacing, flex and typography are CSS classes (e.g. pa-4, d-flex, text-center).',
    }
  },
  get_table(store, a) {
    const node = needTable(store, a.id)
    const settings = Object.fromEntries(describeFields('VDataTable').map(field => [field.prop, node.props[field.prop]]))
    return {
      id: node.id,
      columns: tableColumns(node),
      rows: tableRows(node),
      boundToState: { columns: typeof node.props.headers === 'string', rows: typeof node.props.items === 'string' },
      cellContent: Object.fromEntries(
        tableColumns(node).map(column => [column.key, (node.slots[cellSlotName(column.key)] ?? []).map(summarize)]),
      ),
      cellSlotHint:
        'Add components to a cell with add_component using slot "item.<column key>". Use {{ value }} and {{ item.<key> }} inside.',
      settings,
      availableSettings: describeFields('VDataTable'),
    }
  },
  add_table_column(store, a) {
    const { id, ...column } = a
    const created = store.table.addColumn(need(store, id).id, column)
    ok(!!created, store.notice || 'Could not add column')
    return { column: created, ...tableState(store, id) }
  },
  update_table_column(store, a) {
    const { id, column, ...patch } = a
    ok(store.table.updateColumn(need(store, id).id, column, patch), store.notice || 'Could not update column')
    return tableState(store, id)
  },
  remove_table_column(store, a) {
    ok(store.table.removeColumn(need(store, a.id).id, a.column), store.notice || 'Could not remove column')
    return tableState(store, a.id)
  },
  add_table_row(store, a) {
    const index = store.table.addRow(need(store, a.id).id, a.values, a.index)
    ok(index !== null, store.notice || 'Could not add row')
    return { index, ...tableState(store, a.id) }
  },
  update_table_row(store, a) {
    ok(store.table.updateRow(need(store, a.id).id, a.index, a.values), store.notice || 'Could not update row')
    return tableState(store, a.id)
  },
  remove_table_row(store, a) {
    ok(store.table.removeRow(need(store, a.id).id, a.index), store.notice || 'Could not remove row')
    return tableState(store, a.id)
  },
}
