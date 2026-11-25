import { MAX_DOCUMENT_DEPTH, MAX_DOCUMENT_NODES, TEXT_NODE_TYPE } from './constants'
import { isRecord, validateElements } from './documentValidator'
import { withDependencies } from './computedVariables'
import { isDataSource } from './dataSources'
import { variableNameError } from './projectMutations'
import { childNodes, findNodeById, getNodeList, walkNodes, type NodeLocation } from './treeUtils'
import { variablesOfNode } from './variableUsage'
import type { DataSource, Project, UiNode } from './types'
import type { NodeMutationContext } from './nodeMutations'

/** Marks clipboard text as elements of this editor, so any other text is left alone. */
const CLIPBOARD_KIND = 'ui-builder/elements'

export interface CopiedElements {
  nodes: UiNode[]
  /** Starting values of the variables the elements use, for a project that does not have them yet. */
  state: Record<string, unknown>
  computed: Record<string, string>
  sources: Record<string, DataSource>
}

export interface ClipboardMutationContext extends NodeMutationContext {
  getRoot(): UiNode
  ensureVariables(variables: Record<string, unknown>): void
  /** Adds the computed variables and data sources the project does not have yet. */
  ensureDataSettings(computed: Record<string, string>, sources: Record<string, DataSource>): void
  setSelectedNodeIds(ids: string[]): void
}

/** The picked elements in the order they appear, without those that are already inside another picked one. */
export function pickedElements(root: UiNode, ids: readonly string[]): UiNode[] {
  const wanted = new Set(ids)
  const picked: UiNode[] = []
  const visit = (node: UiNode) => {
    // The root is the page itself: it cannot be copied, only what is inside it.
    if (node !== root && wanted.has(node.id)) picked.push(node)
    else childNodes(node).forEach(visit)
  }
  visit(root)
  return picked
}

export function serializeElements(nodes: UiNode[], project: Project): string {
  const used = nodes.flatMap(node => [...walkNodes(node)]).flatMap(variablesOfNode)
  const names = new Set(
    withDependencies(
      used.map(({ name }) => name),
      project.computed,
    ),
  )
  for (const [name, { loadingVariable }] of Object.entries(project.sources ?? {}))
    if (names.has(name) && loadingVariable) names.add(loadingVariable)
  const pick = <T>(table: Record<string, T> = {}) =>
    Object.fromEntries(Object.entries(table).filter(([name]) => names.has(name)))
  return JSON.stringify({
    kind: CLIPBOARD_KIND,
    nodes,
    state: pick(project.state),
    computed: pick(project.computed),
    sources: pick(project.sources),
  })
}

/** The entries of a table from outside that have a usable variable name and a valid value. */
function namedEntries<T>(table: unknown, isEntry: (item: unknown) => item is T): Record<string, T> {
  const entries = Object.entries(isRecord(table) ? table : {})
  return Object.fromEntries(
    entries.filter((entry): entry is [string, T] => variableNameError(entry[0]) === null && isEntry(entry[1])),
  )
}

/** Elements held by a clipboard text, or null when the text is something else. Throws when they are damaged. */
export function parseElements(text: string): CopiedElements | null {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return null
  }
  if (!isRecord(data) || data.kind !== CLIPBOARD_KIND) return null
  if (!Array.isArray(data.nodes) || !data.nodes.length) throw new Error('The copied elements are empty.')
  return {
    nodes: validateElements(data.nodes),
    state: namedEntries(data.state, (_): _ is unknown => true),
    computed: namedEntries(data.computed, (item): item is string => typeof item === 'string'),
    sources: namedEntries(data.sources, isDataSource),
  }
}

interface PasteTarget {
  parent: UiNode
  slotName: string | null
  index: number
}

const appendedTo = (parent: UiNode): PasteTarget => ({ parent, slotName: null, index: parent.children.length })
const after = (location: NodeLocation): PasteTarget => ({ ...location, index: location.index + 1 })

/**
 * Where pasted elements go: next to the selection when it is the very element that was copied, otherwise inside the
 * selected container, or next to a selected element that cannot hold anything. Nothing selected means the page.
 */
function pasteTarget(
  context: ClipboardMutationContext,
  copied: CopiedElements,
  selectedIds: readonly string[],
): PasteTarget {
  const root = context.getRoot()
  const lastId = selectedIds.at(-1)
  const selected = lastId ? context.findNodeById(lastId) : null
  if (!selected || selected.id === root.id) return appendedTo(root)

  const location = context.findParentAndIndex(selected.id)
  const isOriginal = copied.nodes.some(node => node.id === selected.id)
  if (!isOriginal && context.canContain(selected)) return appendedTo(selected)
  return location ? after(location) : appendedTo(root)
}

const depthOf = (node: UiNode): number => 1 + Math.max(0, ...childNodes(node).map(depthOf))
const countOf = (node: UiNode) => [...walkNodes(node)].length

/** Why the document could no longer be saved and read back after the paste, or null. */
function limitProblem(root: UiNode, target: PasteTarget, nodes: UiNode[]): string | null {
  const parentDepth = (node: UiNode, depth: number): number | null => {
    if (node.id === target.parent.id) return depth
    for (const child of childNodes(node)) {
      const found = parentDepth(child, depth + 1)
      if (found !== null) return found
    }
    return null
  }
  const total = countOf(root) + nodes.reduce((sum, node) => sum + countOf(node), 0)
  const deepest = (parentDepth(root, 0) ?? 0) + Math.max(...nodes.map(depthOf))
  return total > MAX_DOCUMENT_NODES || deepest > MAX_DOCUMENT_DEPTH
    ? 'Pasting this would make the page too large.'
    : null
}

export function pasteElements(
  context: ClipboardMutationContext,
  text: string,
  selectedIds: readonly string[],
): boolean {
  let copied: CopiedElements | null
  try {
    copied = parseElements(text)
  } catch {
    context.setNotice('The copied elements are damaged and cannot be pasted.')
    return false
  }
  if (!copied) return false

  const target = pasteTarget(context, copied, selectedIds)
  if (!context.canContain(target.parent, target.slotName)) {
    context.setNotice('Choose a container that accepts this content.')
    return false
  }
  const problem = limitProblem(context.getRoot(), target, copied.nodes)
  if (problem) {
    context.setNotice(problem)
    return false
  }

  context.commit()
  context.ensureVariables(copied.state)
  context.ensureDataSettings(copied.computed, copied.sources)
  const parent = findNodeById(target.parent.id, context.getRoot())!
  if (target.slotName) parent.slots[target.slotName] ??= []
  const list = getNodeList({ parent, slotName: target.slotName, index: target.index })
  const pasted = copied.nodes.map((node, offset) => {
    const clone = context.cloneNodeWithNewIds(node)
    if (clone.type !== TEXT_NODE_TYPE) clone.name = context.uniqueName(clone.name)
    // Added one at a time, so the next copy sees this name as taken.
    list.splice(target.index + offset, 0, clone)
    return clone
  })
  context.setSelectedNodeIds(pasted.map(node => node.id))
  context.commit()
  const what = pasted.length === 1 ? pasted[0].name : `${pasted.length} elements`
  context.setNotice(`Pasted ${what} into ${parent.name}.`)
  return true
}
