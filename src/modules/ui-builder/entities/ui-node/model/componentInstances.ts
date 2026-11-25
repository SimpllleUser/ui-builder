/**
 * An instance is an element linked to a saved component. Its content is kept in the document like any other
 * element, so preview, export and project files need no library, and is rebuilt from the original when that changes.
 */
import { INSTANCE_ID_SEPARATOR, TEXT_NODE_TYPE } from './constants'
import { applyPrefabProps, type PrefabPropValues } from './prefabProps'
import { childNodes, walkNodes } from './treeUtils'
import type { InstanceLink, Prefab, UiNode } from './types'

export type PrefabLookup = ReadonlyMap<string, Prefab>

export const prefabLookup = (prefabs: readonly Prefab[]): PrefabLookup =>
  new Map(prefabs.map(prefab => [prefab.prefabId, prefab]))

/** Only the parameters the component has and that differ from its defaults, so the other ones keep following it. */
export function createInstanceLink(prefab: Prefab, values: PrefabPropValues = {}): InstanceLink {
  const overrides = (prefab.props ?? []).flatMap(({ name, defaultValue }) =>
    name in values && values[name] !== defaultValue ? [[name, values[name]]] : [],
  )
  return { prefabId: prefab.prefabId, values: Object.fromEntries(overrides) }
}

/** The element an instance link stands for, or null when the original is gone or contains itself. */
export function materializeInstance(
  library: PrefabLookup,
  link: InstanceLink,
  id: string,
  name: string,
  enclosing: ReadonlySet<string> = new Set(),
): UiNode | null {
  const prefab = library.get(link.prefabId)
  if (!prefab || enclosing.has(link.prefabId)) return null
  const inside = new Set([...enclosing, link.prefabId])
  const source = applyPrefabProps(prefab.node, prefab.props ?? [], link.values)

  const build = (node: UiNode, nodeId: string): UiNode => {
    const nested = node !== source && node.instance
    const rebuilt = nested ? materializeInstance(library, nested, nodeId, node.name, inside) : null
    if (rebuilt) return rebuilt
    const child = (item: UiNode) => build(item, `${id}${INSTANCE_ID_SEPARATOR}${item.id}`)
    return {
      ...node,
      id: nodeId,
      children: node.children.map(child),
      slots: Object.fromEntries(Object.entries(node.slots).map(([slot, nodes]) => [slot, nodes.map(child)])),
    }
  }

  return {
    ...build(source, id),
    // The name of a text element is its text, so it comes from the original.
    name: source.type === TEXT_NODE_TYPE ? source.name : name,
    instance: { prefabId: link.prefabId, values: { ...link.values } },
  }
}

const linkedIds = (node: UiNode) => [...walkNodes(node)].flatMap(item => item.instance?.prefabId ?? [])

/** Whether putting the component `prefabId` inside the component `ownerId` would make one contain itself. */
export function wouldRecurse(library: PrefabLookup, prefabId: string, ownerId: string): boolean {
  const seen = new Set<string>()
  const contains = (current: string): boolean => {
    if (current === ownerId) return true
    if (seen.has(current)) return false
    seen.add(current)
    const prefab = library.get(current)
    return !!prefab && linkedIds(prefab.node).some(contains)
  }
  return contains(prefabId)
}

/** Whether these elements hold an instance that the component `ownerId` may not contain. */
export const holdsRecursion = (library: PrefabLookup, nodes: UiNode[], ownerId: string) =>
  nodes.some(node => linkedIds(node).some(prefabId => wouldRecurse(library, prefabId, ownerId)))

/**
 * Rebuilds every instance under `root` from its original, in place. `ownerId` is the component the tree belongs to.
 * Returns whether anything changed.
 */
export function syncInstances(root: UiNode, library: PrefabLookup, ownerId: string | null = null): boolean {
  let changed = false
  const visit = (list: UiNode[]) => {
    list.forEach((node, index) => {
      const link = node.instance
      const allowed = link && !(ownerId && wouldRecurse(library, link.prefabId, ownerId))
      const next = allowed ? materializeInstance(library, link, node.id, node.name) : null
      if (!next) {
        visit(node.children)
        Object.values(node.slots).forEach(visit)
        return
      }
      if (JSON.stringify(next) === JSON.stringify(node)) return
      list[index] = next
      changed = true
    })
  }
  visit(root.children)
  Object.values(root.slots).forEach(visit)
  return changed
}

/**
 * For every element that belongs to an instance, the id of the outermost one it belongs to (an instance root
 * belongs to itself). An instance whose original is gone is an ordinary copy and owns nothing.
 */
export function instanceOwners(root: UiNode, library: PrefabLookup): Map<string, string> {
  const owners = new Map<string, string>()
  const visit = (node: UiNode, owner: string | null) => {
    const current = owner ?? (node.instance && library.has(node.instance.prefabId) ? node.id : null)
    if (current) owners.set(node.id, current)
    childNodes(node).forEach(child => visit(child, current))
  }
  visit(root, null)
  return owners
}
