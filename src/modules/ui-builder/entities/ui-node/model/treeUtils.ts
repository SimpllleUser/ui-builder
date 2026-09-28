import type { UiNode } from './types'

export type NodeLocation = {
  parent: UiNode
  index: number
  slotName: string | null
}

export function findNodeById(id: string, node: UiNode): UiNode | null {
  if (node.id === id) return node

  for (const child of getChildren(node)) {
    const found = findNodeById(id, child)
    if (found) return found
  }

  return null
}

export function findParentAndIndex(id: string, parent: UiNode): NodeLocation | null {
  const childIndex = parent.children.findIndex(child => child.id === id)
  if (childIndex !== -1) return { parent, index: childIndex, slotName: null }

  for (const [slotName, nodes] of Object.entries(parent.slots)) {
    const slotIndex = nodes.findIndex(child => child.id === id)
    if (slotIndex !== -1) return { parent, index: slotIndex, slotName }
  }

  for (const child of getChildren(parent)) {
    const found = findParentAndIndex(id, child)
    if (found) return found
  }

  return null
}

export function getNodeList(location: NodeLocation): UiNode[] {
  return location.slotName
    ? location.parent.slots[location.slotName]
    : location.parent.children
}

function getChildren(node: UiNode): UiNode[] {
  return [...node.children, ...Object.values(node.slots).flat()]
}
