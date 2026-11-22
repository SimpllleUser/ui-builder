import type { UiAction } from '../entities/ui-node/model/types'
import { need, ok, summarize, type McpCommand, type Store } from './mcpCommandUtils'

export const pageSummary = (store: Store) =>
  store.pages.map(page => ({
    id: page.id,
    name: page.name,
    path: page.path,
    active: page.id === store.activePage.id && !store.editingLayout,
  }))
const needPage = (store: Store, id: unknown) => {
  const page = store.pages.find(item => item.id === id || item.path === id)
  if (!page) throw new Error(`Page not found: ${String(id)}`)
  return page
}

export const MCP_PAGE_COMMANDS: Record<string, McpCommand> = {
  list_pages: store => ({
    pages: pageSummary(store),
    hasLayout: !!store.project.layout,
    editingLayout: store.editingLayout,
  }),
  add_page(store, a) {
    const page = store.addPage(a.name, a.path)
    if (!page) throw new Error(store.notice || 'Could not add page')
    return { id: page.id, path: page.path }
  },
  set_route(store, a) {
    const page = needPage(store, a.id)
    ok(store.updatePage(page.id, { name: a.name, path: a.path }), store.notice || 'Could not update page')
    return { pages: pageSummary(store) }
  },
  select_page(store, a) {
    const page = needPage(store, a.id)
    store.selectPage(page.id)
    return { editing: page.id }
  },
  delete_page(store, a) {
    ok(store.deletePage(needPage(store, a.id).id), 'Cannot delete the last page')
    return { pages: pageSummary(store) }
  },
  edit_layout: (store, a) => {
    store.editLayout(a.enabled !== false)
    return { editingLayout: store.editingLayout }
  },
  set_state(store, a) {
    if (a.value === null) store.removeStateVariable(a.name)
    else ok(store.setStateVariable(a.name, a.value), store.notice || 'Invalid state name')
    return { state: store.project.state }
  },
  set_binding(store, a) {
    const node = need(store, a.id)
    const patch: Record<string, string> = {}
    for (const key of ['model', 'vIf', 'vFor']) if (a[key] !== undefined) patch[key] = a[key] ?? ''
    store.updateNodeLogic(node.id, patch)
    return summarize(node)
  },
  set_event(store, a) {
    const node = need(store, a.id)
    const click = a.click as UiAction | null | undefined
    store.updateNodeLogic(node.id, { events: click ? { click } : undefined })
    return summarize(node)
  },
}
