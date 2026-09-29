// src/modules/ui-builder/entities/ui-node/ui/NodeRenderer.ts
import { defineComponent, h, ref, type Component, type PropType, resolveDynamicComponent, type VNode } from 'vue'
import * as Components from 'vuetify/components'
import { storeToRefs } from 'pinia'
import { useUiTreeStore } from '../model/store'
import { getComponentDef } from '../model/componentDefinitions'
import { TEXT_NODE_TYPE } from '../model/constants'
import type { UiNode } from '../model/types'

/** Currently highlighted drop target on the canvas. Exported so MainCanvas can clear it. */
export const canvasDragTargetId = ref<string | null>(null)

const NodeRenderer = defineComponent({
  name: 'NodeRenderer',
  props: {
    node: { type: Object as PropType<UiNode>, required: true }
  },
  setup(props) {
    const store = useUiTreeStore()
    const { selectedNodeIds, isPreviewMode } = storeToRefs(store)

    return () => {
      const { node } = props
      if (!node || !node.id) return null

      if (node.type === TEXT_NODE_TYPE) {
        return h('span', {
          style: 'display: inline-block; min-width: 8px;',
          'data-node-id': node.id,
          onClick: isPreviewMode.value ? undefined : (e: MouseEvent) => { e.stopPropagation(); e.shiftKey || e.metaKey || e.ctrlKey ? store.toggleMultiSelect(node.id) : store.selectNode(node.id) },
          class: [
            ...(node.classes || []),
            { 'ui-builder-element': !isPreviewMode.value },
            { 'is-selected': !isPreviewMode.value && selectedNodeIds.value.includes(node.id) }
          ]
        }, node.name)
      }

      const VComponent = resolveDynamicComponent(
        node.type in Components ? Components[node.type as keyof typeof Components] : node.type,
      ) as Component | string
      const isSelected = selectedNodeIds.value.includes(node.id)
      const isLeaf = getComponentDef(node.type)?.isLeaf ?? false

      const slots: Record<string, () => VNode[]> = {}

      if (!isLeaf) {
        slots.default = () =>
          node.children.map(child =>
            h(NodeRenderer, { key: child.id, node: child })
          )
      }

      if (node.slots) {
        Object.entries(node.slots).forEach(([slotName, slotChildren]) => {
          if (slotChildren.length > 0) {
            slots[slotName] = () =>
              slotChildren.map(child =>
                h(NodeRenderer, { key: child.id, node: child })
              )
          }
        })
      }

      const extraProps: Record<string, unknown> = {}
      if (node.type === 'VImg' && !node.props.src) {
        extraProps.src =
          'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%"><rect width="100%" height="100%" fill="%23e0e0e0"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="14" fill="%23999">No image</text></svg>'
      }

      // ─── Preview mode: render clean component without editor chrome ───────
      if (isPreviewMode.value) {
        return h(VComponent, { ...node.props, ...extraProps, class: node.classes || [] }, slots)
      }

      // ─── Canvas drag-and-drop (non-leaf containers only) ──────────────────
      const dragHandlers = !store.canContain(node) ? {} : {
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
          if (getComponentDef(type)) store.addComponent(type, node.id)
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
          'data-node-id': node.id,
          class: [
            ...(node.classes || []),
            'ui-builder-element',
            { 'is-selected': isSelected },
            { 'is-drag-over': !isLeaf && canvasDragTargetId.value === node.id }
          ],
          onClick: (e: MouseEvent) => {
            e.stopPropagation()
            e.shiftKey || e.metaKey || e.ctrlKey ? store.toggleMultiSelect(node.id) : store.selectNode(node.id)
          },
          ...dragHandlers
        },
        slots
      )
    }
  }
})

export default NodeRenderer
