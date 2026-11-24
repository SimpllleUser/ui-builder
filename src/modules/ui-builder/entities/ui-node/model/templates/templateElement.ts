import { TEXT_NODE_TYPE } from '../constants'
import type { UiAction, UiNode } from '../types'

export interface TemplateContext {
  createNode(type: string, name?: string): UiNode
  cloneNodeWithNewIds(node: UiNode): UiNode
  /** `prepare` runs inside the same undo step, right before the element is added. */
  appendNode(parentId: string, node: UiNode, slotName: string | null, prepare?: () => void): boolean
  /** Adds variables the project does not have yet; existing ones keep their value. */
  ensureVariables(variables: Record<string, unknown>): void
}

/** What a template builds: the element and the variables its behavior needs. */
export interface Built {
  node: UiNode
  variables: Record<string, unknown>
}

/** Settings a caller may pass to a template (from the UI, a script or MCP); anything missing falls back to a default. */
export type TemplateProps = Record<string, unknown>

export type Builder = (context: TemplateContext, props: TemplateProps) => Built

export interface ElementOptions {
  name?: string
  props?: Record<string, unknown>
  classes?: string[]
  /** Text of the element, for those that have a text inside (buttons, titles…). */
  text?: string
  children?: UiNode[]
  model?: string
  vIf?: string
  click?: UiAction
}

/** An element with its settings in one place, so a template reads like the page it builds. */
export function element(context: TemplateContext, type: string, options: ElementOptions = {}): UiNode {
  const node = context.createNode(type, options.name)
  if (options.props) node.props = { ...node.props, ...options.props }
  if (options.classes) node.classes = options.classes
  if (options.text !== undefined) {
    const text = node.children.find(child => child.type === TEXT_NODE_TYPE)
    if (text) text.name = options.text
  }
  if (options.children) node.children = options.children
  if (options.model) node.model = options.model
  if (options.vIf) node.vIf = options.vIf
  if (options.click) node.events = { click: options.click }
  return node
}
