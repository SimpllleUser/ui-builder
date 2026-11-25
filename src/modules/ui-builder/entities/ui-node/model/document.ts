import { DOCUMENT_VERSION, OUTLET_NODE_TYPE, ROOT_NODE_ID } from './constants'
import { validateProject } from './documentValidator'
import { createNodeId } from './nodeUtils'
import type { Page, Project, UiNode } from './types'

export const emptyDocument = (name = 'Untitled page'): UiNode => ({
  id: ROOT_NODE_ID,
  type: 'VCard',
  name,
  props: { variant: 'flat', color: 'transparent' },
  classes: ['w-100', 'pa-4'],
  children: [],
  slots: {},
})

export const emptyPage = (name = 'Home', path = '/'): Page => ({
  id: createNodeId('page'),
  name,
  path,
  root: emptyDocument(name),
})
export const emptyProject = (): Project => ({ pages: [emptyPage()], layout: null, state: {} })

/** Layout with a top bar, a navigation drawer and the place where the current page is rendered. */
export function defaultLayout(createNode: (type: string, name?: string) => UiNode): UiNode {
  const root = emptyDocument('Shared layout')
  const app = createNode('VApp')
  const main = app.children.find(child => child.type === 'VMain')
  main?.children.push(createNode(OUTLET_NODE_TYPE))
  root.children.push(app)
  return root
}

/** Accepts v2 projects and v1 documents (a single page tree). */
export function parseProject(text: string): Project {
  return validateProject(JSON.parse(text) as unknown)
}

export const serializeProject = (project: Project) => JSON.stringify({ version: DOCUMENT_VERSION, ...project }, null, 2)

/** The document of a project nothing was done in yet. */
export const emptyProjectDocument = () => serializeProject(emptyProject())
