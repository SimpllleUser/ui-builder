// src/modules/ui-builder/entities/ui-node/ui/NodeRenderer.ts
import { defineComponent, h, type Component, type PropType, resolveDynamicComponent, type VNode } from 'vue'
import * as Components from 'vuetify/components'
import { storeToRefs } from 'pinia'
import { useUiTreeStore } from '../model/store'
import { getComponentDef } from '../model/componentDefinitions'
import { OUTLET_NODE_TYPE, TEXT_NODE_TYPE } from '../model/constants'
import {
  applyMask,
  bindAction,
  evaluateCondition,
  interpolate,
  interpolateProps,
  repeatItems,
  type Scope,
} from '../model/runtime'
import type { UiNode } from '../model/types'
import { canvasDragTargetId, createDropHandlers } from './canvasDrag'
import { statusChipSlots, tableHeight } from './dataTableRendering'

export { canvasDragTargetId }

const NO_IMAGE_PLACEHOLDER =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%"><rect width="100%" height="100%" fill="%23e0e0e0"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="14" fill="%23999">No image</text></svg>'

/** Overlays are drawn inline in the editor so their content can be edited; they are real overlays in preview. */
const OVERLAY_TYPES = new Set(['VDialog', 'VMenu', 'VSnackbar', 'VTooltip'])

type Slots = Record<string, (...args: any[]) => VNode | VNode[]>

const NodeRenderer = defineComponent({
  name: 'NodeRenderer',
  props: {
    node: { type: Object as PropType<UiNode>, required: true },
    /** Variables for bindings: `item` and `index` inside a repeated element, `value` inside a table cell. */
    scope: { type: Object as PropType<Scope>, default: () => ({}) },
    /** True while rendering page content, so a layout outlet inside a page cannot render the page again. */
    inPage: { type: Boolean, default: false },
  },
  setup(props) {
    const store = useUiTreeStore()
    const { selectedNodeIds, isPreviewMode } = storeToRefs(store)

    const select = (e: MouseEvent, id: string) => {
      e.stopPropagation()
      e.shiftKey || e.metaKey || e.ctrlKey ? store.toggleMultiSelect(id) : store.selectNode(id)
    }

    /** Children rendered with `base` variables; in preview an element with `vFor` is repeated once per item. */
    const renderNodes = (nodes: UiNode[], base: Scope, bindingScope: Scope, preview: boolean): VNode[] =>
      nodes.flatMap(child => {
        const items = preview ? repeatItems(child.vFor, { ...bindingScope, ...base }) : null
        if (!items) return [h(NodeRenderer, { key: child.id, node: child, scope: base, inPage: props.inPage })]
        return items.map((item, index) =>
          h(NodeRenderer, {
            key: `${child.id}:${index}`,
            node: child,
            scope: { ...base, item, index },
            inPage: props.inPage,
          }),
        )
      })

    const renderText = (node: UiNode, preview: boolean, scope: Scope) =>
      h(
        'span',
        {
          style: 'display: inline-block; min-width: 8px;',
          'data-node-id': node.id,
          onClick: preview ? undefined : (e: MouseEvent) => select(e, node.id),
          class: [
            ...node.classes,
            { 'ui-builder-element': !preview },
            { 'is-selected': !preview && selectedNodeIds.value.includes(node.id) },
          ],
        },
        preview || props.scope.item !== undefined ? String(interpolate(node.name, scope) ?? '') : node.name,
      )

    const renderOutlet = (node: UiNode, preview: boolean) => {
      if (preview)
        return props.inPage
          ? null
          : h(NodeRenderer, { node: store.previewPage.root, inPage: true, key: store.previewPage.id })
      return h(
        'div',
        {
          'data-node-id': node.id,
          class: [
            'ui-builder-element',
            'outlet-placeholder',
            { 'is-selected': selectedNodeIds.value.includes(node.id) },
          ],
          onClick: (e: MouseEvent) => select(e, node.id),
        },
        'Page content appears here',
      )
    }

    const renderOverlayPlaceholder = (node: UiNode, classes: unknown[], render: (nodes: UiNode[]) => VNode[]) => {
      const label = h(
        'div',
        { class: 'overlay-placeholder__label' },
        `${getComponentDef(node.type)?.label ?? node.type} — ${node.type === 'VTooltip' ? String(node.props.text ?? '') : 'opens in preview'}`,
      )
      const isLeaf = !!getComponentDef(node.type)?.isLeaf
      return h(
        'div',
        {
          'data-node-id': node.id,
          class: [
            'ui-builder-element',
            'overlay-placeholder',
            ...classes,
            {
              'is-selected': selectedNodeIds.value.includes(node.id),
              'is-drag-over': !isLeaf && canvasDragTargetId.value === node.id,
            },
          ],
          onClick: (e: MouseEvent) => select(e, node.id),
          ...(isLeaf ? {} : createDropHandlers(store, node)),
        },
        [label, ...render(node.children), ...Object.values(node.slots).flatMap(render)],
      )
    }

    /** Default and named slots. A data table's cell slots receive the row (`item`), cell `value` and `index`. */
    const buildSlots = (node: UiNode, render: (nodes: UiNode[], base?: Scope) => VNode[]): Slots => {
      const slots: Slots = {}
      if (!getComponentDef(node.type)?.isLeaf) slots.default = () => render(node.children)
      for (const [slotName, slotChildren] of Object.entries(node.slots)) {
        if (!slotChildren.length) continue
        slots[slotName] =
          node.type === 'VDataTable'
            ? ({ item, value, index }: { item: unknown; value: unknown; index: number }) =>
                render(slotChildren, { ...props.scope, item, value, index })
            : () => render(slotChildren)
      }
      return slots
    }

    /** Preview-only props: v-model binding, masked input and the click action. */
    const previewBindings = (node: UiNode, mask: unknown, scope: Scope): Record<string, unknown> => {
      const bindings: Record<string, unknown> = {}
      if (node.model) {
        const key = node.model
        bindings.modelValue = store.runtimeState[key]
        bindings['onUpdate:modelValue'] = (value: unknown) => {
          store.runtimeState[key] =
            typeof value === 'string' && typeof mask === 'string' && mask ? applyMask(value, mask) : value
        }
      }
      const click = node.events?.click
      if (click) {
        if (node.type === 'VDataTable') {
          bindings['onClick:row'] = (_: Event, row: { item: unknown }) =>
            store.dispatchAction(bindAction(click, { ...scope, item: row.item }))
        } else {
          // Stop here so a button inside a table cell does not also trigger the row click.
          bindings.onClick = (e: Event) => {
            e.stopPropagation()
            store.dispatchAction(bindAction(click, scope))
          }
        }
      }
      return bindings
    }

    const renderComponent = (node: UiNode, preview: boolean, scope: Scope): VNode => {
      const isLeaf = !!getComponentDef(node.type)?.isLeaf
      const resolvedProps = preview ? interpolateProps(node.props, scope) : { ...node.props }
      // `class`/`style` set through MCP or import must not be lost when the editor adds its own classes.
      const { class: propClass, style: propStyle, mask, ...componentProps } = resolvedProps
      const classes = [propClass, ...node.classes]
      const render = (nodes: UiNode[], base: Scope = props.scope) => renderNodes(nodes, base, scope, preview)

      const slots = buildSlots(node, render)
      const extraProps: Record<string, unknown> = {}
      if (propStyle !== undefined) extraProps.style = propStyle
      if (node.type === 'VImg' && !componentProps.src) extraProps.src = NO_IMAGE_PLACEHOLDER
      if (node.type === 'VDataTable') {
        for (const [name, slot] of Object.entries(statusChipSlots(componentProps.headers))) slots[name] ??= slot
        componentProps.height = tableHeight(componentProps.height)
      }

      const VComponent = resolveDynamicComponent(
        node.type in Components ? Components[node.type as keyof typeof Components] : node.type,
      ) as Component | string

      if (preview)
        return h(
          VComponent,
          { ...componentProps, ...extraProps, ...previewBindings(node, mask, scope), class: classes },
          slots,
        )

      return h(
        VComponent,
        {
          ...componentProps,
          ...extraProps,
          'data-node-id': node.id,
          class: [
            ...classes,
            'ui-builder-element',
            { 'is-selected': selectedNodeIds.value.includes(node.id) },
            { 'is-drag-over': !isLeaf && canvasDragTargetId.value === node.id },
          ],
          onClick: (e: MouseEvent) => select(e, node.id),
          ...(store.canContain(node) ? createDropHandlers(store, node) : {}),
        },
        slots,
      )
    }

    return (): VNode | null => {
      const { node } = props
      if (!node?.id) return null
      const preview = isPreviewMode.value
      // Preview bindings see project state first, then repeat variables.
      const scope: Scope = preview ? { ...store.runtimeState, ...props.scope } : props.scope
      if (preview && !evaluateCondition(node.vIf, scope)) return null

      if (node.type === TEXT_NODE_TYPE) return renderText(node, preview, scope)
      if (node.type === OUTLET_NODE_TYPE) return renderOutlet(node, preview)
      if (!preview && OVERLAY_TYPES.has(node.type)) {
        const classes = [node.props.class, ...node.classes]
        return renderOverlayPlaceholder(node, classes, nodes => renderNodes(nodes, props.scope, scope, preview))
      }
      return renderComponent(node, preview, scope)
    }
  },
})

export default NodeRenderer
