import { getComponentDef } from './componentDefinitions'
import { DOCUMENT_VERSION, MAX_DOCUMENT_DEPTH, MAX_DOCUMENT_NODES, ROOT_NODE_ID } from './constants'
import type { UiNode } from './types'

export function validateDocument(value: unknown): UiNode {
  if (!isRecord(value) || value.version !== DOCUMENT_VERSION) {
    throw new Error('Unsupported document version.')
  }

  const ids = new Set<string>()
  let nodeCount = 0
  const root = validateNode(value.root, ids, () => ++nodeCount, 0)

  if (root.id !== ROOT_NODE_ID || root.type !== 'VCard') {
    throw new Error('Invalid document root.')
  }

  return root
}

function validateNode(
  value: unknown,
  ids: Set<string>,
  countNode: () => number,
  depth: number,
): UiNode {
  if (!isRecord(value) || countNode() > MAX_DOCUMENT_NODES || depth > MAX_DOCUMENT_DEPTH) {
    throw new Error('Document is too large or deeply nested.')
  }

  const { id, type, name, classes, children, props, slots } = value
  if (
    typeof id !== 'string' || ids.has(id) ||
    typeof type !== 'string' || !getComponentDef(type) || typeof name !== 'string' ||
    !isStringArray(classes) || !Array.isArray(children) || !isRecord(props) || !isRecord(slots)
  ) {
    throw new Error('Invalid component data in document.')
  }

  ids.add(id)
  const definition = getComponentDef(type)!
  if (children.length && (definition.isLeaf || !definition.slots.some(slot => slot.name === 'default'))) {
    throw new Error('A component contains unsupported children.')
  }

  const validatedSlots: Record<string, UiNode[]> = {}
  for (const [slotName, slotValue] of Object.entries(slots)) {
    if (slotName === 'default' || !definition.slots.some(slot => slot.name === slotName) || !Array.isArray(slotValue)) {
      throw new Error('Invalid component slot.')
    }
    validatedSlots[slotName] = slotValue.map(child => validateNode(child, ids, countNode, depth + 1))
  }

  return {
    ...value,
    children: children.map(child => validateNode(child, ids, countNode, depth + 1)),
    slots: validatedSlots,
  } as UiNode
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string')
}
