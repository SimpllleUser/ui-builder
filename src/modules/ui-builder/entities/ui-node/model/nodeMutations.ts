import type { StepDirection } from './enums'
import { TEXT_NODE_TYPE } from './constants'
import type { UiNode, UiNodeEvents, ValidationRule } from './types'
import type { NodeLocation } from './treeUtils'

export interface NodeMutationContext {
  findNodeById(id: string, node?: UiNode): UiNode | null
  findParentAndIndex(id: string): NodeLocation | null
  getNodeList(location: NodeLocation): UiNode[]
  canContain(node: UiNode, slotName?: string | null): boolean
  cloneNodeWithNewIds(node: UiNode): UiNode
  commit(): void
  selectNode(id: string | null): void
  setNotice(message: string): void
  clearDeletedSelection(): void
  /** Returns a name that no other element in the page uses. */
  uniqueName(name: string): string
}

export function appendNode(
  context: NodeMutationContext,
  parentId: string,
  node: UiNode,
  slotName: string | null = null,
  prepare?: () => void,
): boolean {
  const parent = context.findNodeById(parentId)
  if (!parent || !context.canContain(parent, slotName)) {
    context.setNotice('Choose a container that accepts this content.')
    return false
  }

  context.commit()
  prepare?.()
  if (node.type !== TEXT_NODE_TYPE) node.name = context.uniqueName(node.name)
  if (slotName) (parent.slots[slotName] ??= []).push(node)
  else parent.children.push(node)
  context.selectNode(node.id)
  context.commit()
  context.setNotice(`Added ${node.name} to ${parent.name}${slotName ? ` / ${slotName}` : ''}.`)
  return true
}

export function duplicateNode(context: NodeMutationContext, id: string): string | undefined {
  const location = context.findParentAndIndex(id)
  if (!location) return undefined

  context.commit()
  const list = context.getNodeList(location)
  const clone = context.cloneNodeWithNewIds(list[location.index])
  list.splice(location.index + 1, 0, clone)
  context.selectNode(clone.id)
  context.commit()
  return clone.id
}

export function deleteNode(context: NodeMutationContext, id: string): boolean {
  const location = context.findParentAndIndex(id)
  if (!location) return false

  context.commit()
  context.getNodeList(location).splice(location.index, 1)
  context.clearDeletedSelection()
  context.commit()
  return true
}

export function moveNode(
  context: NodeMutationContext,
  id: string,
  parentId: string,
  slotName: string | null = null,
): boolean {
  const node = context.findNodeById(id)
  const location = context.findParentAndIndex(id)
  const parent = context.findNodeById(parentId)
  if (!node || !location || !parent || !context.canContain(parent, slotName) || context.findNodeById(parentId, node))
    return false

  context.commit()
  context.getNodeList(location).splice(location.index, 1)
  if (slotName) (parent.slots[slotName] ??= []).push(node)
  else parent.children.push(node)
  context.commit()
  context.selectNode(id)
  context.setNotice(`Moved ${node.name} to ${parent.name}.`)
  return true
}

export function canReorder(context: NodeMutationContext, id: string, direction: StepDirection): boolean {
  const location = context.findParentAndIndex(id)
  return (
    !!location && location.index + direction >= 0 && location.index + direction < context.getNodeList(location).length
  )
}

export function reorderNode(context: NodeMutationContext, id: string, direction: StepDirection): void {
  if (!canReorder(context, id, direction)) return

  context.commit()
  const location = context.findParentAndIndex(id)!
  const list = context.getNodeList(location)
  list.splice(location.index + direction, 0, list.splice(location.index, 1)[0])
  context.commit()
}

export interface NodeLogicPatch {
  model?: string
  vIf?: string
  vFor?: string
  events?: UiNodeEvents
  rules?: ValidationRule[]
}

/** Sets bindings, events and rules. An empty value removes that setting. `events` replaces all events. */
export function updateNodeLogic(context: NodeMutationContext, id: string, patch: NodeLogicPatch): boolean {
  const node = context.findNodeById(id)
  if (!node) return false

  context.commit()
  for (const key of ['model', 'vIf', 'vFor'] as const) {
    if (!(key in patch)) continue
    const value = patch[key]?.trim()
    if (value) node[key] = value
    else delete node[key]
  }
  if ('events' in patch) {
    const events = Object.fromEntries(Object.entries(patch.events ?? {}).filter(([, actions]) => actions))
    if (Object.keys(events).length) node.events = events
    else delete node.events
  }
  if ('rules' in patch) {
    if (patch.rules?.length) node.rules = patch.rules
    else delete node.rules
  }
  context.commit()
  return true
}
