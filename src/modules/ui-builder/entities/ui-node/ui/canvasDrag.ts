import { ref } from 'vue'
import { getComponentDef } from '../model/componentDefinitions'
import type { useUiTreeStore } from '../model/store'
import type { UiNode } from '../model/types'

/** Currently highlighted drop target on the canvas. Exported so MainCanvas can clear it. */
export const canvasDragTargetId = ref<string | null>(null)

/** Drag-and-drop handlers that let a container accept components dragged from the palette. */
export function createDropHandlers(store: ReturnType<typeof useUiTreeStore>, node: UiNode) {
  return {
    onDragenter: (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      canvasDragTargetId.value = node.id
    },
    onDragleave: (e: DragEvent) => {
      const element = e.currentTarget as Element
      if (!element?.contains(e.relatedTarget as Node) && canvasDragTargetId.value === node.id) canvasDragTargetId.value = null
    },
    onDragover: (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
    },
    onDrop: (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      canvasDragTargetId.value = null
      const type = e.dataTransfer?.getData('componenttype')
      if (type && getComponentDef(type)) store.addComponent(type, node.id)
    },
    onDragend: () => { canvasDragTargetId.value = null },
  }
}
