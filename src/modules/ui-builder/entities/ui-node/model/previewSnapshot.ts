import { behaviorOf, type TableSummary } from './componentBehaviors'
import { OUTLET_NODE_TYPE, TEXT_NODE_TYPE } from './constants'
import { evaluateCondition, interpolate, repeatItems, type Scope } from './runtime'
import { childNodes } from './treeUtils'
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
  tables: Array<{ id: string; name: string } & TableSummary>
}

const MAX_TEXTS = 300

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
    const summary = behaviorOf(node.type).summarize?.(node, scope)
    if (summary) snapshot.tables.push({ id: node.id, name: node.name, ...summary })
    visitChildren(node, scope)
  }

  const visitChildren = (node: UiNode, scope: Scope) => {
    for (const child of childNodes(node)) visit(child, scope)
  }

  const start = project.layout ?? page.root
  visitOnce(start, state)
  return snapshot
}
