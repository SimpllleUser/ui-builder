import type { UiNode } from './types'
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
}

export function appendNode(
  context: NodeMutationContext,
  parentId: string,
  node: UiNode,
  slotName: string | null = null,
): boolean {
  const parent = context.findNodeById(parentId)
  if (!parent || !context.canContain(parent, slotName)) {
    context.setNotice('Choose a container that accepts this content.')
    return false
  }

  context.commit()
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
  context.setNotice('Element deleted. Use Undo to restore it.')
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
  if (!node || !location || !parent || !context.canContain(parent, slotName) || context.findNodeById(parentId, node)) return false

  context.commit()
  context.getNodeList(location).splice(location.index, 1)
  if (slotName) (parent.slots[slotName] ??= []).push(node)
  else parent.children.push(node)
  context.commit()
  context.selectNode(id)
  context.setNotice(`Moved ${node.name} to ${parent.name}.`)
  return true
}

export function canReorder(context: NodeMutationContext, id: string, direction: number): boolean {
  const location = context.findParentAndIndex(id)
  return !!location && location.index + direction >= 0 && location.index + direction < context.getNodeList(location).length
}

export function reorderNode(context: NodeMutationContext, id: string, direction: number): void {
  if (!canReorder(context, id, direction)) return

  context.commit()
  const location = context.findParentAndIndex(id)!
  const list = context.getNodeList(location)
  list.splice(location.index + direction, 0, list.splice(location.index, 1)[0])
  context.commit()
}
