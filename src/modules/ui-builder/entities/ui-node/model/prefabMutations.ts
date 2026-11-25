import { createInstanceLink, materializeInstance, prefabLookup, wouldRecurse } from './componentInstances'
import { cloneNode, createNodeId } from './nodeUtils'
import { declarePrefabProps, type PrefabPropValues } from './prefabProps'
import type { Prefab, UiNode } from './types'
import type { NodeMutationContext } from './nodeMutations'

export interface PrefabMutationContext extends NodeMutationContext {
  getPrefabs(): Prefab[]
  setPrefabs(prefabs: Prefab[]): void
  getInsertionTargetId(): string
  /** The saved component being edited, or null. */
  getEditingPrefabId(): string | null
  appendNode(parentId: string, node: UiNode, slotName: string | null): boolean
}

export function savePrefab(
  context: PrefabMutationContext,
  nodeId: string,
  name: string,
  defaults: PrefabPropValues = {},
): void {
  const node = context.findNodeById(nodeId)
  const trimmedName = name.trim()
  if (!node || !trimmedName) return

  // A saved component is an original of its own, not an instance of the one it was made from.
  const { instance: _instance, ...original } = cloneNode(node)

  context.setPrefabs([
    ...context.getPrefabs(),
    {
      prefabId: createNodeId('prefab'),
      name: trimmedName,
      node: original,
      props: declarePrefabProps(node, defaults),
    },
  ])
  context.setNotice(`Saved ${trimmedName} to My components.`)
}

/** Adds an instance of a saved component, which follows the original from then on. */
export function insertPrefab(
  context: PrefabMutationContext,
  prefabId: string,
  parentId = context.getInsertionTargetId(),
  slotName: string | null = null,
  propValues: PrefabPropValues = {},
): boolean {
  const library = prefabLookup(context.getPrefabs())
  const prefab = library.get(prefabId)
  if (!prefab) return false

  const ownerId = context.getEditingPrefabId()
  if (ownerId && wouldRecurse(library, prefabId, ownerId)) {
    context.setNotice('A component cannot contain itself.')
    return false
  }

  let parent = context.findNodeById(parentId)
  if (!slotName) {
    while (parent && !context.canContain(parent)) {
      parent = context.findParentAndIndex(parent.id)?.parent ?? null
    }
  }

  const link = createInstanceLink(prefab, propValues)
  const instance = materializeInstance(library, link, createNodeId(), prefab.node.name)
  return !!instance && context.appendNode(parent?.id ?? 'root-canvas', instance, slotName)
}

export function deletePrefab(context: PrefabMutationContext, prefabId: string): void {
  context.setPrefabs(context.getPrefabs().filter(prefab => prefab.prefabId !== prefabId))
}
