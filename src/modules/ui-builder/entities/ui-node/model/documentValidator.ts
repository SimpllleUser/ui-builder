import { isValidAction } from './actions'
import { behaviorOf } from './componentBehaviors'
import { getComponentDef, getNodeSlots } from './componentDefinitions'
import { DOCUMENT_VERSION, MAX_DOCUMENT_DEPTH, MAX_DOCUMENT_NODES, MAX_PAGES, ROOT_NODE_ID } from './constants'
import { OVERRIDE_BREAKPOINTS } from './breakpoints'
import { isCssDeclaration } from './responsiveStyle'
import type { Page, Project, UiNode, UiNodeEvents } from './types'

export function validateProject(value: unknown): Project {
  if (!isRecord(value)) throw new Error('Unsupported document version.')
  // v1: a single page tree under `root`.
  if (value.version === 1) {
    return {
      pages: [{ id: 'page-home', name: 'Home', path: '/', root: { ...validateTree(value.root), name: 'Home' } }],
      layout: null,
      state: {},
    }
  }
  if (value.version !== DOCUMENT_VERSION) throw new Error('Unsupported document version.')

  const { pages, layout, state } = value
  if (!Array.isArray(pages) || !pages.length || pages.length > MAX_PAGES) throw new Error('Invalid pages in document.')
  const pageIds = new Set<string>()
  const paths = new Set<string>()
  const validPages = pages.map((page): Page => {
    if (
      !isRecord(page) ||
      typeof page.id !== 'string' ||
      pageIds.has(page.id) ||
      typeof page.name !== 'string' ||
      typeof page.path !== 'string' ||
      !isValidPagePath(page.path) ||
      paths.has(page.path)
    )
      throw new Error('Invalid page in document.')
    pageIds.add(page.id)
    paths.add(page.path)
    // A page's root is shown under the page's own name.
    return { id: page.id, name: page.name, path: page.path, root: { ...validateTree(page.root), name: page.name } }
  })
  if (state !== undefined && !isRecord(state)) throw new Error('Invalid state in document.')
  return {
    pages: validPages,
    layout: layout === null || layout === undefined ? null : validateTree(layout),
    state: (state as Record<string, unknown>) ?? {},
  }
}

/** Checks elements that come from outside the project, such as the clipboard. Throws when one of them is not valid. */
export function validateElements(values: unknown[]): UiNode[] {
  const ids = new Set<string>()
  let nodeCount = 0
  return values.map(value => validateNode(value, ids, () => ++nodeCount, 0))
}

export const isValidPagePath = (path: string) => /^\/[A-Za-z0-9_\-/]*$/.test(path) && path.length <= 100

function validateTree(value: unknown): UiNode {
  const ids = new Set<string>()
  let nodeCount = 0
  const root = validateNode(value, ids, () => ++nodeCount, 0)
  if (root.id !== ROOT_NODE_ID || root.type !== 'VCard') throw new Error('Invalid document root.')
  return root
}

function validateNode(value: unknown, ids: Set<string>, countNode: () => number, depth: number): UiNode {
  if (!isRecord(value) || countNode() > MAX_DOCUMENT_NODES || depth > MAX_DOCUMENT_DEPTH) {
    throw new Error('Document is too large or deeply nested.')
  }

  const { id, type, name, classes, children, props, slots } = value
  if (
    typeof id !== 'string' ||
    ids.has(id) ||
    typeof type !== 'string' ||
    !getComponentDef(type) ||
    typeof name !== 'string' ||
    !isStringArray(classes) ||
    !Array.isArray(children) ||
    !isRecord(props) ||
    !isRecord(slots)
  ) {
    throw new Error('Invalid component data in document.')
  }

  validateLogic(value)
  validateResponsive(value.responsive)
  ids.add(id)
  const definition = getComponentDef(type)!
  if (children.length && (definition.isLeaf || !definition.slots.some(slot => slot.name === 'default'))) {
    throw new Error('A component contains unsupported children.')
  }

  const validatedSlots: Record<string, UiNode[]> = {}
  for (const [slotName, slotValue] of Object.entries(slots)) {
    // Cell content of a column that no longer exists is dropped rather than making the document unreadable.
    if (behaviorOf(type).canDropStaleSlot?.(slotName) && !getNodeSlots({ type, props }).some(s => s.name === slotName))
      continue
    if (
      slotName === 'default' ||
      !getNodeSlots({ type, props }).some(slot => slot.name === slotName) ||
      !Array.isArray(slotValue)
    ) {
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

function validateResponsive(responsive: unknown) {
  if (responsive === undefined) return
  const valid =
    isRecord(responsive) &&
    Object.entries(responsive).every(
      ([breakpoint, style]) =>
        OVERRIDE_BREAKPOINTS.some(known => known === breakpoint) &&
        isRecord(style) &&
        Object.entries(style).every(([name, item]) => isCssDeclaration(name, item)),
    )
  if (!valid) throw new Error('Invalid responsive style in document.')
}

function validateLogic({ model, vIf, vFor, events }: Record<string, unknown>) {
  const optionalString = (item: unknown) => item === undefined || (typeof item === 'string' && item.length <= 200)
  if (!optionalString(model) || !optionalString(vIf) || !optionalString(vFor))
    throw new Error('Invalid binding in document.')
  if (events === undefined) return
  const click = isRecord(events) ? (events as UiNodeEvents).click : undefined
  const valid =
    isRecord(events) &&
    Object.keys(events).every(key => key === 'click') &&
    (click === undefined || (isRecord(click) && isValidAction(click)))
  if (!valid) throw new Error('Invalid event in document.')
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string')
}
