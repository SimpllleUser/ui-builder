// src/modules/ui-builder/entities/ui-node/ui/NodeRenderer.ts
import { defineComponent, h, ref, type PropType, resolveDynamicComponent } from 'vue'
import * as Components from 'vuetify/components'
import { storeToRefs } from 'pinia'
import { useUiTreeStore } from '../model/store'
import { getComponentDef } from '../model/componentDefinitions'

/** Currently highlighted drop target on the canvas. Exported so MainCanvas can clear it. */
export const canvasDragTargetId = ref<string | null>(null)

const NodeRenderer = defineComponent({
  name: 'NodeRenderer',
  props: {
    node: { type: Object as PropType<any>, required: true }
  },
  setup(props) {
    const store = useUiTreeStore()
    const { selectedNodeId, isPreviewMode } = storeToRefs(store)

    return () => {
      const { node } = props
      if (!node || !node.id) return null

      if (node.type === 'TEXT') {
        return h('span', {
          style: 'pointer-events: none; display: inline-block;',
          class: [
            ...(node.classes || []),
            { 'is-selected': !isPreviewMode.value && selectedNodeId.value === node.id }
          ]
        }, node.name)
      }

      const VComponent = (Components as any)[node.type] || node.type
      const isSelected = selectedNodeId.value === node.id
      const isLeaf = getComponentDef(node.type)?.isLeaf ?? false

      const slots: Record<string, () => any> = {}

      if (!isLeaf) {
        slots.default = () =>
          (node.children || []).map((child: any) =>
            h(resolveDynamicComponent('NodeRenderer') as any, { key: child.id, node: child })
          )
      }

      if (node.slots) {
        Object.entries(node.slots).forEach(([slotName, slotChildren]) => {
          const sChildren = slotChildren as any[]
          if (sChildren.length > 0) {
            slots[slotName] = () =>
              sChildren.map((child: any) =>
                h(resolveDynamicComponent('NodeRenderer') as any, { key: child.id, node: child })
              )
          }
        })
      }

      const extraProps: Record<string, any> = {}
      if (node.type === 'VImg' && !node.props.src) {
        extraProps.src =
          'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%"><rect width="100%" height="100%" fill="%23e0e0e0"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="14" fill="%23999">No image</text></svg>'
      }

      // ─── Preview mode: render clean component without editor chrome ───────
      if (isPreviewMode.value) {
        return h(VComponent, { ...node.props, ...extraProps, class: node.classes || [] }, slots)
      }

      // ─── Canvas drag-and-drop (non-leaf containers only) ──────────────────
      const dragHandlers = isLeaf ? {} : {
        onDragenter: (e: DragEvent) => {
          e.preventDefault()
          e.stopPropagation()
          canvasDragTargetId.value = node.id
        },
        onDragleave: (e: DragEvent) => {
          const el = e.currentTarget as Element
          if (!el?.contains(e.relatedTarget as Node)) {
            if (canvasDragTargetId.value === node.id) canvasDragTargetId.value = null
          }
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
          if (!type) return
          const newNode = store.createNode(type)
          store.appendChild(node.id, newNode)
          store.selectNode(newNode.id)
        },
        onDragend: () => {
          canvasDragTargetId.value = null
        }
      }

      return h(
        VComponent,
        {
          ...node.props,
          ...extraProps,
          class: [
            ...(node.classes || []),
            'ui-builder-element',
            { 'is-selected': isSelected },
            { 'is-drag-over': !isLeaf && canvasDragTargetId.value === node.id }
          ],
          onClick: (e: Event) => {
            e.stopPropagation()
            store.selectNode(node.id)
          },
          ...dragHandlers
        },
        slots
      )
    }
  }
})

export default NodeRenderer
