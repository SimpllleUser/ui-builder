import { TEXT_NODE_TYPE, getNodeSlots, type UiNode } from '../../../entities/ui-node'
import { applyStyleInput } from './mcpStyle'
import { eventsFromInput, rulesFromInput } from './mcpLogic'
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
  /** Short for `events.click`. */
  click?: unknown
  /** `click`, `change`, `submit`, `mounted`: one action or a list. */
  events?: Record<string, unknown>
  rules?: unknown
  /** A name for this element; the answer maps it to the element's id, so later calls can refer to it. */
  ref?: string
  children?: SubtreeSpec[]
  slots?: Record<string, SubtreeSpec[]>
}

export const MAX_SUBTREE_NODES = 500

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
    const events = eventsFromInput(undefined, { ...(spec.click ? { click: spec.click } : {}), ...spec.events })
    if (events) node.events = events
    const rules = spec.rules === undefined ? [] : rulesFromInput(spec.rules)
    if (rules.length) node.rules = rules

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
