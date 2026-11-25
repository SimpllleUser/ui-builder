// src/modules/ui-builder/entities/ui-node/ui/NodeRenderer.ts
import { defineComponent, h, type Component, type PropType, resolveDynamicComponent, type Slot, type VNode } from 'vue'
import * as Components from 'vuetify/components'
import { storeToRefs } from 'pinia'
import { useUiTreeStore } from '../model/store'
import { getComponentDef } from '../model/componentDefinitions'
import { OUTLET_NODE_TYPE, TEXT_NODE_TYPE } from '../model/constants'
import { applyMask, evaluateCondition, interpolate, interpolateProps, repeatItems, type Scope } from '../model/runtime'
import { bindAction } from '../model/actions'
import type { UiNode } from '../model/types'
import { childNodes } from '../model/treeUtils'
import { canvasDragTargetId, createDropHandlers } from './canvasDrag'
import { behaviorMarker } from '../model/behaviorSummary'
import { behaviorOf, clickEventOf, componentProps } from '../model/componentBehaviors'
import { ClickEvent } from '../model/enums'
import { generatedSlots } from './generatedSlots'

export { canvasDragTargetId }

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

    const renderOverlayPlaceholder = (
      node: UiNode,
      note: string,
      classes: unknown[],
      render: (nodes: UiNode[]) => VNode[],
    ) => {
      const label = h(
        'div',
        { class: 'overlay-placeholder__label' },
        `${getComponentDef(node.type)?.label ?? node.type} — ${note}`,
      )
      const isLeaf = !!getComponentDef(node.type)?.isLeaf
      return h(
        'div',
        {
          'data-node-id': node.id,
          ...behaviorMarker(node),
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
        [label, ...render(childNodes(node))],
      )
    }

    /** Default and named slots. A scoped slot, such as a table cell, adds what the component passes to the variables. */
    const buildSlots = (node: UiNode, render: (nodes: UiNode[], base?: Scope) => VNode[]): Record<string, Slot> => {
      const slots: Record<string, Slot> = {}
      if (!getComponentDef(node.type)?.isLeaf) slots.default = () => render(node.children)
      for (const [slotName, slotChildren] of Object.entries(node.slots)) {
        if (!slotChildren.length) continue
        const params = behaviorOf(node.type).slotParams?.(slotName) ?? []
        slots[slotName] = params.length
          ? (passed: Scope) =>
              render(slotChildren, {
                ...props.scope,
                ...Object.fromEntries(params.map(name => [name, passed[name]])),
              })
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
        if (clickEventOf(node.type) === ClickEvent.Row) {
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
      const { class: propClass, style: propStyle, mask } = resolvedProps
      const render = (nodes: UiNode[], base: Scope = props.scope) => renderNodes(nodes, base, scope, preview)

      const behavior = behaviorOf(node.type)
      // In the editor a binding shows the variable's starting value, so the canvas always has real data to draw.
      const shownProps = behavior.previewProps?.(resolvedProps, preview ? scope : store.project.state) ?? resolvedProps
      const classes = [propClass, ...node.classes, ...(behavior.editorClasses?.(shownProps) ?? [])]
      const slots = { ...generatedSlots(node.type, shownProps), ...buildSlots(node, render) }
      const givenProps = componentProps(node.type, shownProps)
      const extraProps: Record<string, unknown> = {}
      if (propStyle !== undefined) extraProps.style = propStyle

      const VComponent = resolveDynamicComponent(
        node.type in Components ? Components[node.type as keyof typeof Components] : node.type,
      ) as Component | string

      if (preview)
        return h(
          VComponent,
          { ...givenProps, ...extraProps, ...previewBindings(node, mask, scope), class: classes },
          slots,
        )

      return h(
        VComponent,
        {
          ...givenProps,
          ...extraProps,
          'data-node-id': node.id,
          ...behaviorMarker(node),
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
      const overlayNote = preview ? undefined : behaviorOf(node.type).overlayNote?.(node.props)
      if (overlayNote !== undefined) {
        const classes = [node.props.class, ...node.classes]
        return renderOverlayPlaceholder(node, overlayNote, classes, nodes =>
          renderNodes(nodes, props.scope, scope, preview),
        )
      }
      return renderComponent(node, preview, scope)
    }
  },
})

export default NodeRenderer
