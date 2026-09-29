import { DOCUMENT_VERSION, ROOT_NODE_ID } from './constants'
import { validateDocument } from './documentValidator'
import type { UiNode } from './types'

export const DOCUMENT_KEY = 'ui-builder:document:v1'
export const emptyDocument = (): UiNode => ({
  id: ROOT_NODE_ID, type: 'VCard', name: 'Untitled page',
  props: { variant: 'flat', color: 'transparent' },
  classes: ['w-100', 'pa-4'], children: [], slots: {},
})

export function parseDocument(text: string): UiNode {
  return validateDocument(JSON.parse(text) as unknown)
}

export const serializeDocument = (root: UiNode) => JSON.stringify({ version: DOCUMENT_VERSION, root }, null, 2)
