import { OUTLET_NODE_TYPE, TEXT_NODE_TYPE } from './constants'
import { evaluateCondition, interpolate, repeatItems, type Scope } from './runtime'
import { resolveTableData } from './tableBindings'
import type { Page, Project, UiNode } from './types'

export interface PreviewSnapshot {
  page: { id: string; name: string; path: string }
  variables: Record<string, unknown>
  /** Text shown on the page, in order. */
  texts: string[]
  /** Elements that “show only when” keeps out of sight right now. */
  hidden: Array<{ id: string; name: string; condition: string }>
  /** What each input shows, by the variable it is linked to. */
  inputs: Array<{ id: string; name: string; variable: string; value: unknown }>
  tables: Array<{ id: string; name: string; columns: string[]; rows: number; rowsShown: number; search: string }>
}

const MAX_TEXTS = 300

/** The rows a table shows for a search text: a row stays when any of its values contains the text. */
const shownRows = (rows: unknown[], search: string) => {
  const needle = search.trim().toLowerCase()
  if (!needle) return rows.length
  return rows.filter(row =>
    Object.values(row as Record<string, unknown>).some(value => String(value).toLowerCase().includes(needle)),
  ).length
}

/** What a person would see in Preview, worked out from the project and the current variables, without drawing it. */
export function snapshotPreview(project: Project, page: Page, state: Scope): PreviewSnapshot {
  const snapshot: PreviewSnapshot = {
    page: { id: page.id, name: page.name, path: page.path },
    variables: state,
    texts: [],
    hidden: [],
    inputs: [],
    tables: [],
  }

  const visit = (node: UiNode, scope: Scope) => {
    if (node.vIf && !evaluateCondition(node.vIf, scope)) {
      snapshot.hidden.push({ id: node.id, name: node.name, condition: node.vIf })
      return
    }
    // An element with “repeat” is drawn once for each item.
    const items = repeatItems(node.vFor, scope)
    if (items && node.vFor) {
      items.forEach((item, index) => visitOnce(node, { ...scope, item, index }))
      return
    }
    visitOnce(node, scope)
  }

  const visitOnce = (node: UiNode, scope: Scope) => {
    if (node.type === OUTLET_NODE_TYPE) return visitChildren(page.root, scope)
    if (node.type === TEXT_NODE_TYPE) {
      const text = String(interpolate(node.name, scope) ?? '').trim()
      if (text && snapshot.texts.length < MAX_TEXTS) snapshot.texts.push(text)
      return
    }
    if (node.model)
      snapshot.inputs.push({ id: node.id, name: node.name, variable: node.model, value: scope[node.model] })
    if (node.type === 'VDataTable') {
      const data = { ...node.props, ...resolveTableData(node.props, scope) }
      const rows = Array.isArray(data.items) ? data.items : []
      const columns = (Array.isArray(data.headers) ? data.headers : []).map(header =>
        String((header as { key?: unknown }).key ?? ''),
      )
      const search = String(interpolate(node.props.search ?? '', scope) ?? '')
      snapshot.tables.push({
        id: node.id,
        name: node.name,
        columns,
        rows: rows.length,
        rowsShown: shownRows(rows, search),
        search,
      })
    }
    visitChildren(node, scope)
  }

  const visitChildren = (node: UiNode, scope: Scope) => {
    for (const child of [...node.children, ...Object.values(node.slots).flat()]) visit(child, scope)
  }

  const start = project.layout ?? page.root
  visitOnce(start, state)
  return snapshot
}
