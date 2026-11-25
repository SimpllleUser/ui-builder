import { INSTANCE_ID_SEPARATOR } from './constants'
import type { UiNode } from './types'

export function createNodeId(prefix = 'ui'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`
}

export function cloneNode<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

export function cloneNodeWithNewIds(node: UiNode): UiNode {
  return regenerateNodeIds(cloneNode(node), () => null)
}

/** `rename` gives the new id of an element whose id has to follow another one, or null for a fresh id. */
function regenerateNodeIds(node: UiNode, rename: (id: string) => string | null): UiNode {
  const id = rename(node.id) ?? createNodeId()
  const prefix = `${node.id}${INSTANCE_ID_SEPARATOR}`
  // What is inside an instance is named after it, so the copy matches what a rebuild from the original gives.
  const inner = node.instance
    ? (childId: string) => (childId.startsWith(prefix) ? id + childId.slice(node.id.length) : rename(childId))
    : rename
  const regenerate = (child: UiNode) => regenerateNodeIds(child, inner)

  return {
    ...node,
    id,
    children: node.children.map(regenerate),
    slots: Object.fromEntries(Object.entries(node.slots).map(([slotName, nodes]) => [slotName, nodes.map(regenerate)])),
  }
}

/** A container with no elements inside it, neither as children nor in any named slot. */
export const isNodeEmpty = (node: UiNode): boolean =>
  !node.children.length && !Object.values(node.slots).some(nodes => nodes.length)
