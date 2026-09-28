import type { ComponentDef } from './componentDefinitions'
import type { UiNode } from './types'
import type { NodeMutationContext } from './nodeMutations'

export interface ContainerMutationContext extends NodeMutationContext {
  createNode(type: string): UiNode
  getComponentDef(type: string): ComponentDef | undefined
  setSelectedNodeIds(ids: string[]): void
}

export function areNodesSiblings(context: ContainerMutationContext, ids: string[]): boolean {
  const locations = ids.map(id => context.findParentAndIndex(id))
  return locations.length > 0 && locations.every(location =>
    location && location.parent.id === locations[0]?.parent.id && location.slotName === locations[0]?.slotName,
  )
}

export function wrapNodes(context: ContainerMutationContext, ids: string[], type: string): void {
  if (!areNodesSiblings(context, ids) || !context.getComponentDef(type)?.isWrapContainer) return

  context.commit()
  const locations = ids.map(id => context.findParentAndIndex(id)!).sort((a, b) => a.index - b.index)
  const list = context.getNodeList(locations[0])
  const wrapper = context.createNode(type)
  wrapper.children = locations.map(location => list[location.index])

  for (const location of [...locations].reverse()) list.splice(location.index, 1)
  list.splice(locations[0].index, 0, wrapper)
  context.selectNode(wrapper.id)
  context.commit()
}

export function getUnwrapReason(context: ContainerMutationContext, id: string): string {
  const node = context.findNodeById(id)
  if (!node || id === 'root-canvas' || !context.getComponentDef(node.type)?.isWrapContainer) {
    return 'Choose a container to unwrap.'
  }
  if (Object.values(node.slots).some(nodes => nodes.length)) {
    return 'Move content out of named slots before unwrapping this container.'
  }
  if (!node.children.length) return 'This container has no children to unwrap.'
  return ''
}

export function unwrapNode(context: ContainerMutationContext, id: string): boolean {
  const reason = getUnwrapReason(context, id)
  if (reason) {
    context.setNotice(reason)
    return false
  }

  const location = context.findParentAndIndex(id)!
  context.commit()
  const list = context.getNodeList(location)
  const children = list[location.index].children
  list.splice(location.index, 1, ...children)
  context.setSelectedNodeIds(children.map(child => child.id))
  context.commit()
  return true
}
