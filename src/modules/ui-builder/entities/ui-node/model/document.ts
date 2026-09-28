import { getComponentDef } from './componentDefinitions'
import {
  DOCUMENT_VERSION,
  MAX_DOCUMENT_DEPTH,
  MAX_DOCUMENT_NODES,
  ROOT_NODE_ID,
} from './constants'
import type { UiNode } from './types'

export const DOCUMENT_KEY = 'ui-builder:document:v1'
export const emptyDocument = (): UiNode => ({
  id: ROOT_NODE_ID, type: 'VCard', name: 'Untitled page',
  props: { variant: 'flat', color: 'transparent' },
  classes: ['w-100', 'pa-4'], children: [], slots: {},
})

export function parseDocument(text: string): UiNode {
  const document = JSON.parse(text)
  if (document.version !== DOCUMENT_VERSION) throw new Error('Unsupported document version.')
  const ids = new Set<string>()
  let count = 0
  const validate = (node: any, depth = 0): void => {
    if (++count > MAX_DOCUMENT_NODES || depth > MAX_DOCUMENT_DEPTH) throw new Error('Document is too large or deeply nested.')
    if (!node || typeof node.id !== 'string' || ids.has(node.id) ||
      !getComponentDef(node.type) || typeof node.name !== 'string' ||
      !Array.isArray(node.classes) || !node.classes.every((c: unknown) => typeof c === 'string') ||
      !Array.isArray(node.children) || !node.props || typeof node.props !== 'object' || Array.isArray(node.props) ||
      !node.slots || typeof node.slots !== 'object' || Array.isArray(node.slots)) {
      throw new Error('Invalid component data in document.')
    }
    ids.add(node.id)
    const def = getComponentDef(node.type)!
    if (node.children.length && (def.isLeaf || !def.slots.some(s => s.name === 'default'))) {
      throw new Error('A component contains unsupported children.')
    }
    for (const [name, nodes] of Object.entries(node.slots)) {
      if (name === 'default' || !def.slots.some(s => s.name === name) || !Array.isArray(nodes)) {
        throw new Error('Invalid component slot.')
      }
      nodes.forEach(child => validate(child, depth + 1))
    }
    node.children.forEach((child: unknown) => validate(child, depth + 1))
  }
  validate(document.root)
  if (document.root.id !== ROOT_NODE_ID || document.root.type !== 'VCard') throw new Error('Invalid document root.')
  return document.root
}

export const serializeDocument = (root: UiNode) => JSON.stringify({ version: DOCUMENT_VERSION, root }, null, 2)
