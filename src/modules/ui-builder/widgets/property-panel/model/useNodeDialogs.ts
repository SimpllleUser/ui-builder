import { computed, ref, type ComputedRef } from 'vue'
import {
  childNodes,
  declarePrefabProps,
  findPrefabPropNames,
  getNodeSlots,
  ROOT_NODE_ID,
  type PrefabProp,
  type useUiTreeStore,
  type UiNode,
} from '../../../entities/ui-node'
import { canSavePrefabName, parseMoveDestination } from './propertyPanelUtils'

type Store = ReturnType<typeof useUiTreeStore>

/** The “Save to My components” dialog for the selected element. */
export function useSavePrefabDialog(store: Store, node: ComputedRef<UiNode | null>) {
  const open = ref(false)
  const name = ref('')
  const parameters = ref<PrefabProp[]>([])
  /** Names the element already uses as `{{props.name}}`; more parameters can be created by hand. */
  const propNames = computed(() => (node.value ? findPrefabPropNames(node.value) : []))
  const show = () => {
    name.value = node.value?.name ?? ''
    parameters.value = node.value ? declarePrefabProps(node.value) : []
    open.value = true
  }
  const save = () => {
    if (node.value && canSavePrefabName(name.value)) {
      store.savePrefab(node.value.id, name.value, {}, parameters.value)
      open.value = false
    }
  }
  const saveParameter = (parameter: PrefabProp) => {
    const exists = parameters.value.some(item => item.name === parameter.name)
    parameters.value = exists
      ? parameters.value.map(item => (item.name === parameter.name ? parameter : item))
      : [...parameters.value, parameter]
  }
  const removeParameter = (parameterName: string) => {
    parameters.value = parameters.value.filter(item => item.name !== parameterName)
  }
  return { open, name, parameters, propNames, show, save, saveParameter, removeParameter }
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
      for (const child of childNodes(current)) visit(child, names)
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
