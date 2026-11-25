import { computed, type Ref } from 'vue'
import {
  createInstanceLink,
  instanceOwners,
  materializeInstance,
  prefabLookup,
  syncInstances,
} from './componentInstances'
import type { PrefabPropValues } from './prefabProps'
import { findParentAndIndex, getNodeList } from './treeUtils'
import type { Prefab, UiNode } from './types'

export const LOCKED_NOTICE = 'This is a component instance. Edit the original or detach it to change what is inside.'

interface InstanceSources {
  rootNode: Ref<UiNode>
  prefabs: Ref<Prefab[]>
  commit(): void
  setNotice(message: string): void
}

/** The instances in the tree being edited: which elements they lock, and what can be done with them. */
export function useComponentInstances({ rootNode, prefabs, commit, setNotice }: InstanceSources) {
  const library = computed(() => prefabLookup(prefabs.value))
  const owners = computed(() => instanceOwners(rootNode.value, library.value))

  /** Whether the element is an instance or part of one, so its content comes from the original. */
  const isLocked = (id: string) => owners.value.has(id)
  /** Whether the element is part of an instance, so it cannot even be moved or removed by itself. */
  const isInsideInstance = (id: string) => isLocked(id) && owners.value.get(id) !== id
  /** The element a click on `id` selects: the instance as a whole, or the element itself. */
  const selectableId = (id: string) => owners.value.get(id) ?? id
  /** The original of the instance whose root is `id`, or null. */
  const originalOf = (id: string): Prefab | null => {
    if (owners.value.get(id) !== id) return null
    const link = findParentAndIndex(id, rootNode.value)
    const node = link && getNodeList(link)[link.index]
    return (node?.instance && library.value.get(node.instance.prefabId)) || null
  }

  /** Says why nothing happened to a locked element, and gives back the answer of a refused change. */
  const refuse = <T>(answer: T): T => {
    setNotice(LOCKED_NOTICE)
    return answer
  }
  /** Runs `change` unless `locked`. */
  const unless = <T>(locked: boolean, refused: T, change: () => T): T => (locked ? refuse(refused) : change())

  /** Sets parameter values of an instance; the other parameters keep their values. */
  const setInstanceProps = (id: string, values: PrefabPropValues): boolean => {
    const location = findParentAndIndex(id, rootNode.value)
    const prefab = originalOf(id)
    if (!location || !prefab) return false
    const list = getNodeList(location)
    const node = list[location.index]
    const link = createInstanceLink(prefab, { ...node.instance!.values, ...values })
    const next = materializeInstance(library.value, link, node.id, node.name)
    if (!next) return false
    list[location.index] = next
    return true
  }

  /** Turns an instance into an ordinary copy that can be edited and no longer follows the original. */
  const detachInstance = (id: string): boolean => {
    const location = findParentAndIndex(id, rootNode.value)
    const node = location && getNodeList(location)[location.index]
    if (!node?.instance) return false
    commit()
    delete node.instance
    commit()
    setNotice(`Detached ${node.name} from its component.`)
    return true
  }

  /** Rebuilds the instances of these trees from the library. Returns whether any changed. */
  const syncRoots = (roots: UiNode[]) =>
    roots.reduce((changed, root) => syncInstances(root, library.value) || changed, false)

  /** The same for the saved components themselves, which may hold instances of each other. */
  const syncLibrary = () => {
    for (const prefab of prefabs.value) syncInstances(prefab.node, library.value, prefab.prefabId)
  }

  return {
    isLocked,
    isInsideInstance,
    selectableId,
    originalOf,
    refuse,
    unless,
    setInstanceProps,
    detachInstance,
    syncRoots,
    syncLibrary,
  }
}
