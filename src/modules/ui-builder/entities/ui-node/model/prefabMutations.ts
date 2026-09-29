import { cloneNode, cloneNodeWithNewIds, createNodeId } from './nodeUtils'
import type { Prefab, UiNode } from './types'
import type { NodeMutationContext } from './nodeMutations'

export interface PrefabMutationContext extends NodeMutationContext {
  getPrefabs(): Prefab[]
  setPrefabs(prefabs: Prefab[]): void
  getInsertionTargetId(): string
  appendNode(parentId: string, node: UiNode, slotName: string | null): boolean
}

export function savePrefab(context: PrefabMutationContext, nodeId: string, name: string): void {
  const node = context.findNodeById(nodeId)
  const trimmedName = name.trim()
  if (!node || !trimmedName) return

  context.setPrefabs([
    ...context.getPrefabs(),
    { prefabId: createNodeId('prefab'), name: trimmedName, node: cloneNode(node) },
  ])
  context.setNotice(`Saved ${trimmedName} to My components.`)
}

export function insertPrefab(
  context: PrefabMutationContext,
  prefabId: string,
  parentId = context.getInsertionTargetId(),
  slotName: string | null = null,
): boolean {
  const prefab = context.getPrefabs().find(item => item.prefabId === prefabId)
  if (!prefab) return false

  let parent = context.findNodeById(parentId)
  if (!slotName) {
    while (parent && !context.canContain(parent)) {
      parent = context.findParentAndIndex(parent.id)?.parent ?? null
    }
  }

  return context.appendNode(parent?.id ?? 'root-canvas', cloneNodeWithNewIds(prefab.node), slotName)
}

export function deletePrefab(context: PrefabMutationContext, prefabId: string): void {
  context.setPrefabs(context.getPrefabs().filter(prefab => prefab.prefabId !== prefabId))
  context.setNotice('Saved component deleted.')
}
