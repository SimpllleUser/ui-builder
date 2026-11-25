import { actionReferences } from './actions'
import { TEXT_NODE_TYPE } from './constants'
import { EventName } from './enums'
import { eventEntries } from './events'
import { expressionError, expressionVariables } from './expression'
import { walkNodes } from './treeUtils'
import type { Project, UiNode } from './types'

/** Names that exist inside repeated elements, table cells and saved-component templates (`props`) without being defined as variables. */
export const AMBIENT_NAMES = new Set(['item', 'index', 'value', 'props'])
const BINDING = /\{\{\s*([^{}]+?)\s*\}\}/g
const ROOT_NAME = /^\s*!?\s*([A-Za-z_$][\w$]*)/

/** The variables a text refers to with `{{ name.path }}`. */
export const bindingRoots = (text: string): string[] =>
  [...text.matchAll(BINDING)].flatMap(match => ROOT_NAME.exec(match[1])?.[1] ?? [])

/** How an element uses a variable. */
export enum UsageKind {
  Text = 'text',
  Property = 'property',
  Link = 'link',
  Repeat = 'repeat',
  Condition = 'condition',
  Click = 'click',
  Event = 'event',
}

export interface VariableReference {
  name: string
  kind: UsageKind
}

/** The project variables one element reads or writes itself (not its children). Repeat-only names such as `item` are left out. */
export function variablesOfNode(node: UiNode): VariableReference[] {
  const references: VariableReference[] = []
  const add = (name: string | undefined, kind: UsageKind) => {
    if (name && !AMBIENT_NAMES.has(name)) references.push({ name, kind })
  }
  const addBindings = (text: string, kind: UsageKind) => bindingRoots(text).forEach(name => add(name, kind))

  if (node.type === TEXT_NODE_TYPE) addBindings(node.name, UsageKind.Text)
  for (const value of Object.values(node.props)) if (typeof value === 'string') addBindings(value, UsageKind.Property)
  add(node.model, UsageKind.Link)
  if (node.vFor) add(ROOT_NAME.exec(node.vFor)?.[1], UsageKind.Repeat)
  if (node.vIf && !expressionError(node.vIf))
    expressionVariables(node.vIf).forEach(name => add(name, UsageKind.Condition))
  for (const [event, actions] of eventEntries(node.events)) {
    const kind = event === EventName.Click ? UsageKind.Click : UsageKind.Event
    for (const action of actions) {
      const { variable, text } = actionReferences(action)
      add(variable, kind)
      if (text) addBindings(text, kind)
    }
  }
  return references
}

export interface ProjectNode {
  node: UiNode
  /** The page the element is on; missing for the shared layout. */
  pageId?: string
}

/** Every element of every page and of the shared layout. */
export function* walkProject(project: Project): Generator<ProjectNode> {
  for (const page of project.pages) for (const node of walkNodes(page.root)) yield { node, pageId: page.id }
  if (project.layout) for (const node of walkNodes(project.layout)) yield { node }
}

export interface VariableUsage extends VariableReference {
  nodeId: string
  nodeName: string
  pageId: string | null
  pageName: string
}

const LAYOUT_NAME = 'Shared layout'
const TEXT_PREVIEW_LENGTH = 30

/** Where each variable is used, for showing a person what a change to it would touch. */
export function findVariableUsages(project: Project): VariableUsage[] {
  const pageNames = new Map(project.pages.map(page => [page.id, page.name]))
  return [...walkProject(project)].flatMap(({ node, pageId }) =>
    variablesOfNode(node).map(reference => ({
      ...reference,
      nodeId: node.id,
      nodeName: node.type === TEXT_NODE_TYPE ? `“${node.name.slice(0, TEXT_PREVIEW_LENGTH)}”` : node.name,
      pageId: pageId ?? null,
      pageName: (pageId && pageNames.get(pageId)) || LAYOUT_NAME,
    })),
  )
}
