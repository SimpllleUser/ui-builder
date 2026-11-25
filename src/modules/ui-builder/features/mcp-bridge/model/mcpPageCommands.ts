import { DEFAULT_DELAY_MS, hasValidation, StepDirection } from '../../../entities/ui-node'
import { eventsFromInput, rulesFromInput } from './mcpLogic'
import { need, needEditable, ok, summarize, type McpCommand, type Store } from './mcpCommandUtils'

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
  duplicate_page(store, a) {
    const copy = store.duplicatePage(needPage(store, a.id).id)
    ok(!!copy, 'Could not duplicate page')
    return { id: copy!.id, path: copy!.path }
  },
  move_page(store, a) {
    ok(
      store.movePage(needPage(store, a.id).id, a.direction === 'left' ? StepDirection.Back : StepDirection.Forward),
      'Page cannot move further',
    )
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
    const node = needEditable(store, a.id)
    const patch: Record<string, string> = {}
    for (const key of ['model', 'vIf', 'vFor']) if (a[key] !== undefined) patch[key] = a[key] ?? ''
    store.updateNodeLogic(node.id, patch)
    return summarize(node)
  },
  set_event(store, a) {
    const node = needEditable(store, a.id)
    store.updateNodeLogic(node.id, { events: eventsFromInput(node.events, a) })
    return summarize(node)
  },
  set_rules(store, a) {
    const node = needEditable(store, a.id)
    if (!hasValidation(node.type)) throw new Error(`${node.type} is not a form field, so it has no rules.`)
    store.updateNodeLogic(node.id, { rules: rulesFromInput(a.rules) })
    return summarize(node)
  },
  set_computed(store, a) {
    ok(store.setComputed(String(a.name), a.expression ?? null), store.notice || 'Invalid computed variable')
    return { computed: store.project.computed ?? {} }
  },
  set_data_source(store, a) {
    const source =
      a.url === null || a.url === undefined
        ? null
        : { url: String(a.url), delayMs: a.delayMs ?? DEFAULT_DELAY_MS, loadingVariable: a.loadingVariable }
    ok(store.setDataSource(String(a.name), source), store.notice || 'Invalid data source')
    return { sources: store.project.sources ?? {} }
  },
}
