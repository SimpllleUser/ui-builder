import { ref, type ComputedRef, type Ref } from 'vue'
import { readSpacing, writeSpacing } from '../../../entities/ui-node/model/layoutControls'
import type { UiNode } from '../../../entities/ui-node/model/types'

const SPACING_SIDES = [
  { label: 'All', value: 'a' }, { label: 'Top', value: 't' },
  { label: 'Bottom', value: 'b' }, { label: 'Left', value: 'l' },
  { label: 'Right', value: 'r' }, { label: 'X (Horiz)', value: 'x' },
  { label: 'Y (Vert)', value: 'y' },
]

const SPACING_SIZES = [
  { title: 'Default / mixed', value: null },
  ...[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 16].map(value => ({ title: `${value * 4} px`, value })),
]

export function useSpacingEditor(
  selectedNode: ComputedRef<UiNode | null>,
  selectedNodeIds: Ref<string[]>,
  findNode: (id: string) => UiNode | null,
  updateClasses: (id: string, classes: string[]) => boolean,
  commit: () => void,
) {
  const activeSpacingType = ref<'m' | 'p'>('m')

  const commonSpacing = (side: string) => {
    const values = selectedNodeIds.value.map(id => {
      const node = findNode(id)
      return node ? readSpacing(node.classes, activeSpacingType.value, side) : null
    })
    return values.every(value => value === values[0]) ? values[0] : null
  }

  const updateCommonSpacing = (side: string, value: number | string | null) => {
    commit()
    for (const id of selectedNodeIds.value) {
      const node = findNode(id)
      if (node) updateClasses(id, writeSpacing(node.classes, activeSpacingType.value, side, value))
    }
    commit()
  }

  const updateSpacing = (type: 'm' | 'p', side: string, value: number | string | null) => {
    if (selectedNode.value) updateClasses(selectedNode.value.id, writeSpacing(selectedNode.value.classes, type, side, value))
  }

  const getSpacingValue = (type: 'm' | 'p', side: string) =>
    readSpacing(selectedNode.value?.classes ?? [], type, side)

  return { activeSpacingType, spacingSides: SPACING_SIDES, spacingSizes: SPACING_SIZES, commonSpacing, updateCommonSpacing, updateSpacing, getSpacingValue }
}
