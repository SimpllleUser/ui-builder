import type { UiNode } from './types'

export function createNodeId(prefix = 'ui'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`
}

export function cloneNode<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

export function cloneNodeWithNewIds(node: UiNode): UiNode {
  const clone = cloneNode(node)
  return regenerateNodeIds(clone)
}

function regenerateNodeIds(node: UiNode): UiNode {
  const id = createNodeId()

  return {
    ...node,
    id,
    children: node.children.map(regenerateNodeIds),
    slots: Object.fromEntries(
      Object.entries(node.slots).map(([slotName, nodes]) => [slotName, nodes.map(regenerateNodeIds)]),
    ),
  }
}

/** A container with no elements inside it, neither as children nor in any named slot. */
export const isNodeEmpty = (node: UiNode): boolean =>
  !node.children.length && !Object.values(node.slots).some(nodes => nodes.length)
