<script lang="ts">
import { Icons } from '../../../shared/icons';
import { defineComponent, h, type Component, type PropType, type VNode } from 'vue';
import { VueDraggableNext as Draggable } from 'vue-draggable-next';
import { VRow, VCol, VBtn, VExpansionPanels, VExpansionPanel } from 'vuetify/components';
import type { NodePropValue, PaletteItem } from '../types';

type ClickNodePayload = { id: number; meta: boolean };
const textProp = (value: NodePropValue | undefined): string | number | undefined =>
  typeof value === 'string' || typeof value === 'number' ? value : undefined;

const nodeProps = {
  node: { type: Object as PropType<PaletteItem>, required: true },
  selectedIds: { type: Array as PropType<number[]>, required: true }
};

const draggableGroup = { name: 'vuetify', pull: true, put: true };
const DraggableComponent: Component = Draggable;
const VRowComponent: Component = VRow;
const VExpansionPanelsComponent: Component = VExpansionPanels;
const VExpansionPanelComponent: Component = VExpansionPanel;

const LegacyNode = defineComponent({
  name: 'Node',
  props: nodeProps,
  emits: {
    'click-node': (_payload: ClickNodePayload) => true,
    remove: (_id: number) => true,
    changed: () => true,
    ungroup: (_id: number) => true
  },
  setup(props, { emit }) {
    const clickNode = (id: number, meta: boolean) => emit('click-node', { id, meta });
    const remove = (id: number, event?: Event) => {
      event?.stopPropagation();
      emit('remove', id);
    };
    const ungroup = (id: number, event?: Event) => {
      event?.stopPropagation();
      emit('ungroup', id);
    };
    const changed = () => emit('changed');

    const actions = (node: PaletteItem): VNode =>
      h('div', { class: 'node-actions' }, [
        node.name === 'Div'
          ? h(VBtn, {
              icon: Icons.Ungroup,
              size: 'x-small',
              variant: 'text',
              density: 'comfortable',
              onClick: (event: Event) => ungroup(node.id, event)
            })
          : null,
        h(VBtn, {
          icon: Icons.Delete,
          size: 'x-small',
          variant: 'text',
          density: 'comfortable',
          onClick: (event: Event) => remove(node.id, event)
        })
      ]);

    const renderChild = (child: PaletteItem): VNode =>
        h(LegacyNode, {
        node: child,
        selectedIds: props.selectedIds ?? [],
        onClickNode: (payload: ClickNodePayload) => emit('click-node', payload),
        onRemove: (id: number) => emit('remove', id),
        onChanged: () => emit('changed'),
        onUngroup: (id: number) => emit('ungroup', id),
        key: child.id
      });

    const renderChildren = (children: PaletteItem[], empty: VNode | VNode[]): VNode[] =>
      children.length ? children.map(renderChild) : (Array.isArray(empty) ? empty : [empty]);

    const renderDropZone = (
      owner: PaletteItem,
      tag: string,
      className: string | string[],
      empty: VNode | VNode[]
    ): VNode =>
      h(
        DraggableComponent,
        {
          modelValue: owner.children ?? [],
          'onUpdate:modelValue': (value: PaletteItem[]) => {
            owner.children = value;
            changed();
          },
          itemKey: 'id',
          group: draggableGroup,
          tag,
          class: className
        },
        { default: () => renderChildren(owner.children ?? [], empty) }
      );

    const handleClick = (event: Event, node: PaletteItem) => {
      const mouseEvent = event as MouseEvent;
      clickNode(node.id, !!(mouseEvent.metaKey || mouseEvent.ctrlKey));
      event.stopPropagation();
    };

    const renderRow = (node: PaletteItem, selected: boolean): VNode => {
      const children = node.children ?? (node.children = []);
      return h(
        DraggableComponent,
        {
          modelValue: children,
          'onUpdate:modelValue': (value: PaletteItem[]) => {
            node.children = value;
            changed();
          },
          itemKey: 'id',
          group: draggableGroup,
          tag: VRowComponent,
          class: ['row-decor', 'bg-blue-lighten-4', 'pa-3', 'rounded-lg', selected ? 'selected' : ''],
          onClick: (event: Event) => handleClick(event, node)
        },
        {
          default: () => [
            h('div', { class: 'box-label position-absolute text-caption' }, 'VRow'),
            actions(node),
            ...renderChildren(children, h(VCol, { cols: 12, class: 'text-grey-darken-1 text-caption py-6' }, () => 'Перетягніть сюди компонент'))
          ]
        }
      );
    };

    const renderColumn = (node: PaletteItem, selected: boolean): VNode => {
      const children = node.children ?? (node.children = []);
      const cols = Number(node.props.cols) || 12;
      const widthPercent = (cols / 12) * 100;
      return h(
        VCol,
        {
          ...node.props,
          class: ['col-decor', 'bg-green-lighten-4', 'pa-3', 'rounded-lg', selected ? 'selected' : ''],
          style: { flex: `0 0 ${widthPercent}%`, maxWidth: `${widthPercent}%` },
          onClick: (event: Event) => handleClick(event, node)
        },
        {
          default: () => [
            h('div', { class: 'box-label position-absolute text-caption' }, `VCol (cols: ${node.props.cols ?? ''})`),
            actions(node),
            renderDropZone(node, 'div', ['inner-list', 'bg-green-lighten-5', 'pa-3', 'rounded-lg'], h('div', { class: 'inner-placeholder text-caption' }, 'Put here'))
          ]
        }
      );
    };

    const renderDiv = (node: PaletteItem, selected: boolean): VNode => {
      const children = node.children ?? (node.children = []);
      return h(
        'div',
        {
          class: ['group-decor', 'bg-grey-lighten-4', 'pa-3', 'rounded-lg', selected ? 'selected' : ''],
          onClick: (event: Event) => handleClick(event, node)
        },
        [
          h('div', { class: 'box-label position-absolute text-caption' }, 'DIV'),
          actions(node),
          renderDropZone(node, 'div', ['inner-list', 'bg-grey-lighten-5', 'pa-3', 'rounded-lg'], h('div', { class: 'inner-placeholder text-caption' }, 'Put here'))
        ]
      );
    };

    const renderExpansionPanels = (node: PaletteItem, selected: boolean): VNode => {
      const children = node.children ?? (node.children = []);
      return h(
        DraggableComponent,
        {
          modelValue: children,
          'onUpdate:modelValue': (value: PaletteItem[]) => {
            node.children = value;
            changed();
          },
          itemKey: 'id',
          group: draggableGroup,
          tag: VExpansionPanelsComponent,
          ...node.props,
          class: ['panels-decor', 'bg-deep-purple-lighten-4', 'pa-3', 'rounded-lg', selected ? 'selected' : ''],
          onClick: (event: Event) => handleClick(event, node)
        },
        {
          default: () => [
            h('div', { class: 'box-label position-absolute text-caption' }, 'VExpansionPanels'),
            actions(node),
            ...renderChildren(children, h('div', { class: 'text-grey-darken-1 text-caption py-6 text-center w-100' }, 'Перетягніть панелі сюди'))
          ]
        }
      );
    };

    const renderExpansionPanel = (node: PaletteItem, selected: boolean): VNode => {
      const children = node.children ?? (node.children = []);
      return h(
        VExpansionPanelComponent,
        {
          value: node.props.value,
          eager: node.props.eager,
          class: ['expansion-panel-decor', selected ? 'selected' : ''],
          onClick: (event: Event) => handleClick(event, node)
        },
        {
          title: () => [
            h('span', { class: 'flex-grow-1 font-weight-medium' }, textProp(node.props.title) ?? 'Panel'),
            h('span', { class: 'text-caption text-medium-emphasis me-1' }, 'VExpansionPanel'),
            h(VBtn, {
              icon: Icons.Delete,
              size: 'x-small',
              variant: 'text',
              density: 'comfortable',
              onClick: (event: Event) => remove(node.id, event)
            })
          ],
          default: () => [
            renderDropZone(node, 'div', ['inner-list', 'bg-deep-purple-lighten-5', 'pa-2', 'rounded-lg'], h('div', { class: 'inner-placeholder text-caption' }, 'Put here'))
          ]
        }
      );
    };

    return () => {
      const node = props.node!;
      const selected = (props.selectedIds ?? []).includes(node.id);

      if (node.name === 'VRow') return renderRow(node, selected);
      if (node.name === 'VCol') return renderColumn(node, selected);
      if (node.name === 'Div') return renderDiv(node, selected);
      if (node.name === 'VExpansionPanels') return renderExpansionPanels(node, selected);
      if (node.name === 'VExpansionPanel') return renderExpansionPanel(node, selected);

      return h(
        'div',
        {
          class: ['leaf', selected ? 'selected' : ''],
          onClick: (event: Event) => handleClick(event, node),
          style: { position: 'relative' }
        },
        [actions(node), h(node.type, node.props, { default: () => textProp(node.props.text) })]
      );
    };
  }
});

export default LegacyNode;
</script>

<style scoped>
.node-actions {
  position: absolute;
  top: 4px;
  right: 4px;
  display: flex;
  gap: 2px;
  z-index: 1;
}
</style>
