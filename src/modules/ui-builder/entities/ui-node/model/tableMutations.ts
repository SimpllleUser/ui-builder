import type { ColumnAlign } from './enums'
import { cellSlotName } from './componentDefinitions'
import type { NodeMutationContext } from './nodeMutations'
import type { UiNode } from './types'

export interface TableColumn {
  title: string
  key: string
  align?: ColumnAlign
  sortable?: boolean
  /** Show the cell as a colored status chip. */
  chip?: boolean
  /** Column width in pixels. */
  width?: number
}
export type TableRow = Record<string, unknown>

export type TableMutationContext = Pick<NodeMutationContext, 'findNodeById' | 'commit' | 'setNotice'>

const COLUMN_KEY = /^[A-Za-z0-9_$-]+$/

/** Why `key` cannot name a column, or null when it can. `own` is the key the column already has. */
export function columnKeyError(columns: TableColumn[], key: string, own?: string): string | null {
  if (!key) return 'Enter a key.'
  if (!COLUMN_KEY.test(key)) return 'Use letters, digits, - and _.'
  if (key !== own && columns.some(column => column.key === key)) return 'Another column already uses this key.'
  return null
}

interface EditableTable {
  node: UiNode
  columns: TableColumn[]
  rows: TableRow[]
}

export const tableColumns = (node: UiNode): TableColumn[] =>
  Array.isArray(node.props.headers) ? (node.props.headers as TableColumn[]) : []
export const tableRows = (node: UiNode): TableRow[] =>
  Array.isArray(node.props.items) ? (node.props.items as TableRow[]) : []

/** The table when it holds its own data; tables whose columns or rows come from state cannot be edited here. */
function editableTable(context: TableMutationContext, id: string): EditableTable | null {
  const node = context.findNodeById(id)
  if (node?.type !== 'VDataTable') {
    context.setNotice('Select a data table.')
    return null
  }
  if (typeof node.props.headers === 'string' || typeof node.props.items === 'string') {
    context.setNotice('This table takes its data from state. Switch it to manual data to edit columns and rows.')
    return null
  }
  return { node, columns: tableColumns(node), rows: tableRows(node) }
}

/** Runs `change` as one undoable step. */
function undoable(context: TableMutationContext, change: () => void) {
  context.commit()
  change()
  context.commit()
}

function uniqueKey(columns: TableColumn[]) {
  let n = columns.length + 1
  while (columns.some(column => column.key === `col${n}`)) n++
  return `col${n}`
}

export function addColumn(
  context: TableMutationContext,
  id: string,
  column: Partial<TableColumn> = {},
): TableColumn | null {
  const table = editableTable(context, id)
  if (!table) return null
  const key = column.key ?? uniqueKey(table.columns)
  const keyError = columnKeyError(table.columns, key)
  if (keyError) {
    context.setNotice(`Column key “${key}”: ${keyError}`)
    return null
  }
  const created: TableColumn = { ...column, key, title: column.title ?? key }
  undoable(context, () => {
    table.node.props.headers = [...table.columns, created]
  })
  return created
}

/** Changing a key moves the column's data and cell content along with it. */
export function updateColumn(
  context: TableMutationContext,
  id: string,
  key: string,
  patch: Partial<TableColumn>,
): boolean {
  const table = editableTable(context, id)
  if (!table) return false
  if (!table.columns.some(column => column.key === key)) {
    context.setNotice(`No column with key "${key}".`)
    return false
  }
  const newKey = patch.key ?? key
  const keyError = newKey === key ? null : columnKeyError(table.columns, newKey)
  if (keyError) {
    context.setNotice(`Column key “${newKey}”: ${keyError}`)
    return false
  }

  undoable(context, () => {
    table.node.props.headers = table.columns.map(column => (column.key === key ? { ...column, ...patch } : column))
    if (newKey === key) return
    table.node.props.items = table.rows.map(({ [key]: value, ...row }) => ({ ...row, [newKey]: value }))
    const cell = table.node.slots[cellSlotName(key)]
    delete table.node.slots[cellSlotName(key)]
    if (cell) table.node.slots[cellSlotName(newKey)] = cell
  })
  return true
}

export function removeColumn(context: TableMutationContext, id: string, key: string): boolean {
  const table = editableTable(context, id)
  if (!table) return false
  if (!table.columns.some(column => column.key === key)) {
    context.setNotice(`No column with key "${key}".`)
    return false
  }
  undoable(context, () => {
    table.node.props.headers = table.columns.filter(column => column.key !== key)
    table.node.props.items = table.rows.map(({ [key]: _removed, ...row }) => row)
    delete table.node.slots[cellSlotName(key)]
  })
  return true
}

/** Adds a row at `index` (default: the end). Columns missing from `values` start empty. */
export function addRow(
  context: TableMutationContext,
  id: string,
  values: TableRow = {},
  index?: number,
): number | null {
  const table = editableTable(context, id)
  if (!table) return null
  const row = { ...Object.fromEntries(table.columns.map(column => [column.key, ''])), ...values }
  const position = index === undefined ? table.rows.length : Math.min(Math.max(0, index), table.rows.length)
  undoable(context, () => {
    table.node.props.items = [...table.rows.slice(0, position), row, ...table.rows.slice(position)]
  })
  return position
}

export function updateRow(context: TableMutationContext, id: string, index: number, values: TableRow): boolean {
  const table = editableTable(context, id)
  if (!table) return false
  if (!table.rows[index]) {
    context.setNotice(`No row ${index}.`)
    return false
  }
  undoable(context, () => {
    table.node.props.items = table.rows.map((row, i) => (i === index ? { ...row, ...values } : row))
  })
  return true
}

export function removeRow(context: TableMutationContext, id: string, index: number): boolean {
  const table = editableTable(context, id)
  if (!table) return false
  if (!table.rows[index]) {
    context.setNotice(`No row ${index}.`)
    return false
  }
  undoable(context, () => {
    table.node.props.items = table.rows.filter((_, i) => i !== index)
  })
  return true
}
