import type { ComputedRef } from 'vue'
import { readFlex, writeFlex } from '../../../entities/ui-node/model/layoutControls'
import type { UiNode } from '../../../entities/ui-node/model/types'

export function useStyleEditor(
  selectedNode: ComputedRef<UiNode | null>,
  updateClasses: (id: string, classes: string[]) => boolean,
) {
  const flexOptions = [
    { title: 'Block', value: 'd-block' },
    { title: 'Flex Row', value: 'd-flex flex-row' },
    { title: 'Flex Column', value: 'd-flex flex-column' },
  ]
  const fontWeights = [
    { title: 'Thin', value: 'font-weight-thin' },
    { title: 'Regular', value: 'font-weight-regular' },
    { title: 'Bold', value: 'font-weight-bold' },
    { title: 'Black', value: 'font-weight-black' },
  ]
  const textAlignments = ['text-left', 'text-center', 'text-right']

  const replaceClassGroup = (prefix: string, value: string | null) => {
    if (!selectedNode.value) return
    updateClasses(selectedNode.value.id, [
      ...selectedNode.value.classes.filter(cls => !cls.startsWith(prefix)),
      ...(value ? [value] : []),
    ])
  }

  return {
    flexOptions,
    fontWeights,
    textAlignments,
    getFlexValue: () => readFlex(selectedNode.value?.classes ?? []),
    setFlexValue: (value: string) => {
      if (selectedNode.value) updateClasses(selectedNode.value.id, writeFlex(selectedNode.value.classes, value))
    },
    getJustifyValue: () => selectedNode.value?.classes.find(cls => cls.startsWith('justify-')) ?? null,
    setJustifyValue: (value: string) => replaceClassGroup('justify-', value),
    getFontWeight: () => selectedNode.value?.classes.find(cls => cls.startsWith('font-weight-')) ?? null,
    setFontWeight: (value: string) => replaceClassGroup('font-weight-', value),
    getTextAlign: () => selectedNode.value?.classes.find(cls => textAlignments.includes(cls)) ?? null,
    setTextAlign: (value: string | null) => {
      if (!selectedNode.value) return
      updateClasses(selectedNode.value.id, [
        ...selectedNode.value.classes.filter(cls => !textAlignments.includes(cls)),
        ...(value ? [value] : []),
      ])
    },
  }
}
