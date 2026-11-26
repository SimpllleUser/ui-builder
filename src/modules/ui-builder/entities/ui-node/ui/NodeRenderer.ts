// src/modules/ui-builder/entities/ui-node/ui/NodeRenderer.ts
import {
  defineComponent,
  h,
  inject,
  nextTick,
  provide,
  ref,
  resolveDynamicComponent,
  type Component,
  type InjectionKey,
  type PropType,
  type Slot,
  type VNode,
} from 'vue'
import * as Components from 'vuetify/components'
import { storeToRefs } from 'pinia'
import { useUiTreeStore } from '../model/store'
import { getComponentDef } from '../model/componentDefinitions'
import { OUTLET_NODE_TYPE, TEXT_NODE_TYPE } from '../model/constants'
import { applyMask, evaluateCondition, interpolate, interpolateProps, repeatItems, type Scope } from '../model/runtime'
import { actionsOf } from '../model/events'
import { isForm } from '../model/forms'
import { vuetifyRules } from '../model/validationRules'
import type { UiNode } from '../model/types'
import { childNodes } from '../model/treeUtils'
import { canvasDragTargetId, createDropHandlers } from './canvasDrag'
import { behaviorMarker } from '../model/behaviorSummary'
import { behaviorOf, clickEventOf, componentProps } from '../model/componentBehaviors'
import { ClickEvent, EventName } from '../model/enums'
import './nodeRenderer.css'
import { generatedSlots } from './generatedSlots'
import { effectiveStyle, hasOverrides, responsiveRules } from '../model/responsiveStyle'
import { GRID_COLUMN_TYPE, gridPropsAt } from '../model/grid'

export { canvasDragTargetId }

/** The form an element is inside, so its actions can reset it. */
interface FormContext {
  node: UiNode
  resetValidation(): void
}
const FORM_CONTEXT: InjectionKey<FormContext> = Symbol('form')

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
    const formInstance = ref<{ resetValidation?: () => void } | null>(null)
    const ownForm: FormContext | undefined = isForm(props.node)
      ? { node: props.node, resetValidation: () => formInstance.value?.resetValidation?.() }
      : undefined
    const form = ownForm ?? inject(FORM_CONTEXT, undefined)
    if (ownForm) provide(FORM_CONTEXT, ownForm)

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

    /** Runs the actions an element has for an event. `names` are those that exist only at that moment. */
    const actionContext = (names: Scope = {}) => ({
      scope: { ...props.scope, ...names },
      form: form?.node,
      // The fields take the new values first, and only then forget their errors.
      onFormReset: () => void nextTick(() => form?.resetValidation()),
    })
    const run = (node: UiNode, event: EventName, names?: Scope) =>
      store.runActions(actionsOf(node.events, event), actionContext(names))

    /** Preview-only props: v-model binding, masked input, validation rules and events. */
    const previewBindings = (node: UiNode, mask: unknown): Record<string, unknown> => {
      const bindings: Record<string, unknown> = {}
      const key = node.model
      if (key) bindings.modelValue = store.runtimeState[key]
      if (key || actionsOf(node.events, EventName.Change).length) {
        bindings['onUpdate:modelValue'] = (value: unknown) => {
          const written = typeof value === 'string' && typeof mask === 'string' && mask ? applyMask(value, mask) : value
          if (key) store.runtimeState[key] = written
          run(node, EventName.Change, { value: written })
        }
      }
      if (node.rules?.length) bindings.rules = vuetifyRules(node.rules)
      if (isForm(node)) {
        // Always handled, because a native submit would reload the frame.
        bindings.onSubmit = async (event: Event & PromiseLike<{ valid: boolean }>) => {
          event.preventDefault()
          if ((await event).valid) run(node, EventName.Submit)
        }
      }
      if (actionsOf(node.events, EventName.Mounted).length) {
        bindings.onVnodeMounted = () =>
          store.runAppearActions(actionsOf(node.events, EventName.Mounted), actionContext())
      }
      if (actionsOf(node.events, EventName.Click).length) {
        if (clickEventOf(node.type) === ClickEvent.Row) {
          bindings['onClick:row'] = (_: Event, row: { item: unknown }) => run(node, EventName.Click, { item: row.item })
        } else {
          // Stop here so a button inside a table cell does not also trigger the row click.
          bindings.onClick = (e: Event) => {
            e.stopPropagation()
            run(node, EventName.Click)
          }
        }
      }
      return bindings
    }

    const renderComponent = (node: UiNode, preview: boolean, scope: Scope): VNode => {
      const isLeaf = !!getComponentDef(node.type)?.isLeaf
      const givenNodeProps = preview ? interpolateProps(node.props, scope) : { ...node.props }
      const resolvedProps =
        !preview && node.type === GRID_COLUMN_TYPE && store.editingBreakpoint
          ? gridPropsAt(givenNodeProps, store.editingBreakpoint)
          : givenNodeProps
      // `class`/`style` set through MCP or import must not be lost when the editor adds its own classes.
      const { class: propClass, style: ownStyle, mask } = resolvedProps
      // Preview has a real screen width, so media queries decide. The canvas shows the screen size being edited.
      const responsive = hasOverrides(node) ? node : null
      const rules = preview && responsive ? responsiveRules(responsive) : null
      const propStyle = rules
        ? Object.keys(rules.inlineStyle).length
          ? interpolateProps(rules.inlineStyle, scope)
          : undefined
        : !preview && responsive
          ? effectiveStyle(responsive, store.editingBreakpoint)
          : ownStyle
      const render = (nodes: UiNode[], base: Scope = props.scope) => renderNodes(nodes, base, scope, preview)

      const behavior = behaviorOf(node.type)
      // In the editor a binding shows the variable's starting value, so the canvas always has real data to draw.
      const shownProps = behavior.previewProps?.(resolvedProps, preview ? scope : store.startingState) ?? resolvedProps
      const classes = [propClass, ...node.classes, ...(behavior.editorClasses?.(shownProps) ?? []), rules?.className]
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
          {
            ...givenProps,
            ...extraProps,
            ...previewBindings(node, mask),
            ...(ownForm ? { ref: formInstance } : {}),
            class: classes,
          },
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
          // A submit button must not reload the editor.
          ...(ownForm ? { onSubmit: (e: Event) => e.preventDefault() } : {}),
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
