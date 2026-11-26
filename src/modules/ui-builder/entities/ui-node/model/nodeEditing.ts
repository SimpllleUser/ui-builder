import type { ComputedRef, Ref } from 'vue'
import { holdsRecursion, prefabLookup } from './componentInstances'
import { getNodeSlots } from './componentDefinitions'
import { parseElements, pasteElements as pasteElementsMutation, pickedElements, serializeElements } from './clipboard'
import type { ClipboardMutationContext } from './clipboard'
import {
  areNodesSiblings as areNodesSiblingsMutation,
  getUnwrapReason,
  unwrapNode as unwrapNodeMutation,
  wrapNodes as wrapNodesMutation,
  type ContainerMutationContext,
} from './containerMutations'
import type { Breakpoint, StepDirection } from './enums'
import { LOCKED_NOTICE, type useComponentInstances } from './instanceStore'
import {
  canReorder as canReorderNode,
  deleteNode as deleteNodeMutation,
  duplicateNode as duplicateNodeMutation,
  moveNode as moveNodeMutation,
  reorderNode as reorderNodeMutation,
  updateNodeLogic as updateNodeLogicMutation,
  type NodeLogicPatch,
} from './nodeMutations'
import { patchNodeStyle, setOverride } from './responsiveStyle'
import * as tableMutations from './tableMutations'
import type { Prefab, Project, UiNode } from './types'

interface NodeEditingSources {
  context: ContainerMutationContext & ClipboardMutationContext
  instances: ReturnType<typeof useComponentInstances>
  project: Ref<Project>
  prefabs: Ref<Prefab[]>
  editingPrefabId: ComputedRef<string | null>
  editingBreakpoint: Ref<Breakpoint | null>
  rootNode: Ref<UiNode>
  selectedNodeIds: Ref<string[]>
  /** The root of a page is renamed together with the page. */
  isPageRoot(id: string): boolean
  renamePage(name: string): void
}

/**
 * Changes to elements of the tree being edited. What belongs to a component instance is refused here, so every way
 * of editing (the panels, the canvas, agents) follows the same rule.
 */
export function useNodeEditing(sources: NodeEditingSources) {
  const { context, instances, project, prefabs, editingPrefabId } = sources
  const { editingBreakpoint, rootNode, selectedNodeIds, isPageRoot, renamePage } = sources
  const { findNodeById, commit, setNotice } = context
  const { isLocked, isInsideInstance, unless, refuse } = instances

  /** The element to change, unless it is missing or locked by an instance. */
  const changeable = (id: string): UiNode | null => (isLocked(id) ? refuse(null) : findNodeById(id))

  const updateSlotChildren = (id: string, slotName: string, children: UiNode[]) => {
    const node = changeable(id)
    if (!node || !getNodeSlots(node).some(slot => slot.name === slotName)) return false
    node.slots[slotName] = children
    return true
  }
  const updateNodeClasses = (id: string, classes: string[]) => {
    const node = changeable(id)
    if (!node) return false
    node.classes = classes
    return true
  }
  const updateNodeName = (id: string, name: string) => {
    const node = findNodeById(id)
    if (!node) return false
    // An instance may be renamed itself.
    if (isInsideInstance(id)) return refuse(false)
    if (isPageRoot(id)) {
      // Typing in the name field: keep the page name and its root in step (an empty name is not allowed).
      if (!name.trim()) return false
      renamePage(name)
    }
    node.name = name
    return true
  }
  /** Replaces all properties of an element at once (the JSON view edits them as one object). */
  const updateNodeProps = (id: string, props: Record<string, unknown>) => {
    const node = changeable(id)
    if (!node) return false
    node.props = props
    return true
  }
  const updateNodeProp = (id: string, prop: string, value: unknown) => {
    const node = changeable(id)
    if (!node) return false
    node.props[prop] = value
    return true
  }
  /** Changes the element's style on the screen size being edited; `null` removes a property there. */
  const updateNodeStyle = (id: string, patch: Record<string, string | null>) => {
    const node = changeable(id)
    if (!node) return false
    patchNodeStyle(node, editingBreakpoint.value, patch)
    return true
  }
  /** Drops what the screen size being edited changes, so the element looks as on larger screens again. */
  const resetNodeOverrides = (id: string) => {
    const node = changeable(id)
    if (!node || !editingBreakpoint.value) return false
    commit()
    setOverride(node, editingBreakpoint.value, {})
    commit()
    return true
  }
  const updateNodeLogic = (id: string, patch: NodeLogicPatch) =>
    unless(isLocked(id), false, () => updateNodeLogicMutation(context, id, patch))

  const duplicateNode = (id: string) =>
    unless(isInsideInstance(id), undefined, () => duplicateNodeMutation(context, id))
  const deleteNode = (id: string) => unless(isInsideInstance(id), false, () => deleteNodeMutation(context, id))
  const areNodesSiblings = (ids: string[]) => areNodesSiblingsMutation(context, ids)
  const wrapNodes = (ids: string[], type: string) =>
    unless(ids.some(isInsideInstance), undefined, () => wrapNodesMutation(context, ids, type))
  const unwrapReason = (id: string) => (isLocked(id) ? LOCKED_NOTICE : getUnwrapReason(context, id))
  const unwrapNode = (id: string) => unless(isLocked(id), false, () => unwrapNodeMutation(context, id))
  const moveNode = (id: string, parentId: string, slotName: string | null = null) =>
    unless(isInsideInstance(id), false, () => moveNodeMutation(context, id, parentId, slotName))
  const canReorder = (id: string, direction: StepDirection) =>
    !isInsideInstance(id) && canReorderNode(context, id, direction)
  const reorderNode = (id: string, direction: StepDirection) => {
    if (canReorder(id, direction)) reorderNodeMutation(context, id, direction)
  }

  /** Runs a change of a table unless the table belongs to an instance. */
  const onTable = <T>(id: string, refused: T, change: () => T) => unless(isLocked(id), refused, change)
  const table = {
    addColumn: (id: string, column?: Partial<tableMutations.TableColumn>) =>
      onTable(id, null, () => tableMutations.addColumn(context, id, column)),
    updateColumn: (id: string, key: string, patch: Partial<tableMutations.TableColumn>) =>
      onTable(id, false, () => tableMutations.updateColumn(context, id, key, patch)),
    removeColumn: (id: string, key: string) => onTable(id, false, () => tableMutations.removeColumn(context, id, key)),
    addRow: (id: string, values?: tableMutations.TableRow, index?: number) =>
      onTable(id, null, () => tableMutations.addRow(context, id, values, index)),
    updateRow: (id: string, index: number, values: tableMutations.TableRow) =>
      onTable(id, false, () => tableMutations.updateRow(context, id, index, values)),
    removeRow: (id: string, index: number) => onTable(id, false, () => tableMutations.removeRow(context, id, index)),
  }

  /** The selected elements as clipboard text, or null when there is nothing to copy. */
  const copySelection = () => {
    const picked = pickedElements(rootNode.value, selectedNodeIds.value)
    if (!picked.length) return null
    setNotice(`Copied ${picked.length === 1 ? picked[0].name : `${picked.length} elements`}.`)
    return serializeElements(picked, project.value)
  }
  /** Whether the clipboard text would put the edited component inside itself. */
  const pastesIntoItself = (text: string) => {
    const ownerId = editingPrefabId.value
    if (!ownerId) return false
    try {
      return holdsRecursion(prefabLookup(prefabs.value), parseElements(text)?.nodes ?? [], ownerId)
    } catch {
      // Damaged text is reported by the paste itself.
      return false
    }
  }
  const pasteElements = (text: string) => {
    if (!pastesIntoItself(text)) return pasteElementsMutation(context, text, selectedNodeIds.value)
    setNotice('A component cannot contain itself.')
    return false
  }

  return {
    updateSlotChildren,
    updateNodeClasses,
    updateNodeName,
    updateNodeProps,
    updateNodeProp,
    updateNodeStyle,
    resetNodeOverrides,
    updateNodeLogic,
    duplicateNode,
    deleteNode,
    areNodesSiblings,
    wrapNodes,
    unwrapReason,
    unwrapNode,
    moveNode,
    canReorder,
    reorderNode,
    table,
    copySelection,
    pasteElements,
  }
}
