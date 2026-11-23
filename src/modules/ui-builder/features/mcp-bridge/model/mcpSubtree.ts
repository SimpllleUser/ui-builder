import { ActionType, TEXT_NODE_TYPE, getNodeSlots, type UiAction, type UiNode } from '../../../entities/ui-node'
import { applyStyleInput } from './mcpStyle'
import type { Store } from './mcpCommandUtils'
import type { StyleInput } from '../../../../../shared/lib/inlineStyle'

/** What an agent can describe for one element when it builds a whole tree in a single call. */
export interface SubtreeSpec {
  type: string
  name?: string
  props?: Record<string, unknown>
  classes?: string[]
  style?: StyleInput
  /** Text of an element that has one inside (button, title…), or of a text element itself. */
  text?: string
  model?: string
  vIf?: string
  vFor?: string
  click?: { type: string; to?: string; key?: string; value?: string }
  /** A name for this element; the answer maps it to the element's id, so later calls can refer to it. */
  ref?: string
  children?: SubtreeSpec[]
  slots?: Record<string, SubtreeSpec[]>
}

export const MAX_SUBTREE_NODES = 500

const toAction = (click: NonNullable<SubtreeSpec['click']>): UiAction => {
  if (click.type === ActionType.Navigate && click.to !== undefined) return { type: ActionType.Navigate, to: click.to }
  if (click.type === ActionType.Set && click.key !== undefined)
    return { type: ActionType.Set, key: click.key, value: String(click.value ?? '') }
  if (click.type === ActionType.Toggle && click.key !== undefined) return { type: ActionType.Toggle, key: click.key }
  throw new Error(
    `Invalid click action: ${JSON.stringify(click)}. Use { type: "navigate", to }, { type: "set", key, value } or { type: "toggle", key }.`,
  )
}

/**
 * Builds the elements a spec describes, without touching the page: nothing is added unless the whole tree is valid.
 * Children and slots given in the spec replace the defaults a component brings; omitted ones keep the defaults.
 */
export function buildSubtree(store: Store, root: SubtreeSpec): { node: UiNode; refs: Record<string, string> } {
  const refs: Record<string, string> = {}
  let count = 0

  const build = (spec: SubtreeSpec, path: string): UiNode => {
    if (++count > MAX_SUBTREE_NODES) throw new Error(`A subtree can have at most ${MAX_SUBTREE_NODES} elements.`)
    if (typeof spec?.type !== 'string') throw new Error(`${path}: every element needs a type.`)
    let node: UiNode
    try {
      node = store.createNode(spec.type, spec.type === TEXT_NODE_TYPE ? spec.text : spec.name)
    } catch {
      throw new Error(`${path}: unknown component type “${spec.type}”. See list_components.`)
    }
    if (spec.props) Object.assign(node.props, spec.props)
    if (spec.classes) node.classes = spec.classes
    if (spec.style) applyStyleInput(node, spec.style)
    if (spec.model) node.model = spec.model
    if (spec.vIf) node.vIf = spec.vIf
    if (spec.vFor) node.vFor = spec.vFor
    if (spec.click) node.events = { click: toAction(spec.click) }

    if (spec.children) {
      if (!store.canContain(node)) throw new Error(`${path}: ${spec.type} cannot contain children.`)
      node.children = spec.children.map((child, index) => build(child, `${path}.children[${index}]`))
    }
    if (spec.text !== undefined && spec.type !== TEXT_NODE_TYPE) {
      let text = node.children.find(child => child.type === TEXT_NODE_TYPE)
      if (!text) {
        if (!store.canContain(node)) throw new Error(`${path}: ${spec.type} cannot hold text.`)
        text = store.createNode(TEXT_NODE_TYPE, spec.text)
        node.children.unshift(text)
      }
      text.name = spec.text
    }
    for (const [slot, specs] of Object.entries(spec.slots ?? {})) {
      if (!getNodeSlots(node).some(item => item.name === slot))
        throw new Error(`${path}: ${spec.type} has no slot “${slot}”.`)
      node.slots[slot] = specs.map((child, index) => build(child, `${path}.slots.${slot}[${index}]`))
    }
    if (spec.ref) {
      if (spec.ref in refs) throw new Error(`${path}: the ref “${spec.ref}” is used twice.`)
      refs[spec.ref] = node.id
    }
    return node
  }

  return { node: build(root, 'root'), refs }
}
