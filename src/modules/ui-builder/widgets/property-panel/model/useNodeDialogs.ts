import { computed, ref, type ComputedRef } from 'vue'
import { getNodeSlots } from '../../../entities/ui-node/model/componentDefinitions'
import { ROOT_NODE_ID } from '../../../entities/ui-node/model/constants'
import type { useUiTreeStore } from '../../../entities/ui-node/model/store'
import type { UiNode } from '../../../entities/ui-node/model/types'
import { canSavePrefabName, parseMoveDestination } from './propertyPanelUtils'

type Store = ReturnType<typeof useUiTreeStore>

/** The “Save to My components” dialog for the selected element. */
export function useSavePrefabDialog(store: Store, node: ComputedRef<UiNode | null>) {
  const open = ref(false)
  const name = ref('')
  const show = () => {
    name.value = node.value?.name ?? ''
    open.value = true
  }
  const save = () => {
    if (node.value && canSavePrefabName(name.value)) {
      store.savePrefab(node.value.id, name.value)
      open.value = false
    }
  }
  return { open, name, show, save }
}

/** The “Move to…” dialog: every container (and named slot) the selected element can be moved into. */
export function useMoveDialog(store: Store, node: ComputedRef<UiNode | null>) {
  const open = ref(false)
  const target = ref('')

  const targets = computed(() => {
    const result: { title: string; value: string }[] = []
    const visit = (current: UiNode, path: string[]) => {
      if (current.id === node.value?.id) return
      const names = [...path, store.nodeLabel(current)]
      if (store.canContain(current))
        result.push({ title: names.join(' / '), value: JSON.stringify([current.id, null]) })
      for (const slot of getNodeSlots(current)) {
        if (current.id !== ROOT_NODE_ID && slot.name !== 'default') {
          result.push({
            title: `${names.join(' / ')} / ${slot.label}`,
            value: JSON.stringify([current.id, slot.name]),
          })
        }
      }
      for (const child of [...current.children, ...Object.values(current.slots).flat()]) visit(child, names)
    }
    visit(store.rootNode, [])
    return result
  })

  const show = () => {
    target.value = ''
    open.value = true
  }
  const move = () => {
    if (!node.value || !target.value) return
    const destination = parseMoveDestination(target.value)
    if (destination && store.moveNode(node.value.id, destination.parentId, destination.slot)) open.value = false
  }
  return { open, target, targets, show, move }
}
