<script lang="ts">
import { Icons } from '../../../shared/icons'
import { defineComponent, h } from 'vue';
import { VueDraggableNext as Draggable } from 'vue-draggable-next';
import { VRow, VCol, VBtn, VExpansionPanels, VExpansionPanel } from 'vuetify/components';
import type { PaletteItem } from '../types';

export default defineComponent({
  name: 'Node',
  props: {
    node: { type: Object as () => PaletteItem, required: true },
    selectedIds: { type: Array as () => number[], required: true }
  },
  emits: ['click-node', 'remove', 'changed', 'ungroup'],
  setup(_, { emit }) {
    const clickNode = (id: number, meta: boolean) => emit('click-node', { id, meta });
    const remove = (id: number, e?: Event) => {
      if (e) e.stopPropagation();
      emit('remove', id);
    };
    const ungroup = (id: number, e?: Event) => {
      if (e) e.stopPropagation();
      emit('ungroup', id);
    };
    const changed = () => emit('changed');
    const actions = (n: PaletteItem) =>
      h('div', { class: 'node-actions' }, [
        n.name === 'Div'
          ? h(VBtn as any, {
              icon: Icons.Ungroup,
              size: 'x-small',
              variant: 'text',
              density: 'comfortable',
              onClick: (e: Event) => ungroup(n.id, e)
            })
          : null,
        h(VBtn as any, {
          icon: Icons.Delete,
          size: 'x-small',
          variant: 'text',
          density: 'comfortable',
          onClick: (e: Event) => remove(n.id, e)
        })
      ]);
    return { clickNode, actions, changed };
  },
  render() {
    const n = this.$props.node as PaletteItem;
    const isSelected = this.$props.selectedIds.includes(n.id);

    const handleClick = (e: Event) => {
      const me = e as MouseEvent;
      this.clickNode(n.id, !!(me.metaKey || me.ctrlKey));
      e.stopPropagation();
    };

    if (n.name === 'VRow') {
      if (!n.children) n.children = [];
      return h(
        Draggable as any,
        {
          modelValue: n.children,
          'onUpdate:modelValue': (v: PaletteItem[]) => {
            n.children = v;
            this.changed();
          },
          itemKey: 'id',
          group: { name: 'vuetify', pull: true, put: true },
          tag: VRow,
          class: ['row-decor', 'bg-blue-lighten-4', 'pa-3', 'rounded-lg', isSelected ? 'selected' : ''],
          onClick: handleClick
        },
        {
          default: () => [
            h('div', { class: 'box-label position-absolute text-caption' }, 'VRow'),
            this.actions(n),
            ...(n.children!.length
              ? n.children!.map(child =>
                  h((this as any).$options, {
                    node: child,
                    selectedIds: this.$props.selectedIds,
                    onClickNode: (p: any) => this.$emit('click-node', p),
                    onRemove: (id: number) => this.$emit('remove', id),
                    onChanged: () => this.$emit('changed'),
                    onUngroup: (id: number) => this.$emit('ungroup', id),
                    key: child.id
                  })
                )
              : [
                  h(
                    VCol as any,
                    { cols: 12, class: 'text-grey-darken-1 text-caption py-6', key: 'placeholder' },
                    'Перетягніть сюди компонент'
                  )
                ])
          ]
        }
      );
    }

    if (n.name === 'VCol') {
      if (!n.children) n.children = [];
      const colsValue = Number(n.props?.cols) || 12;
      const widthPercent = (colsValue / 12) * 100;
      return h(
        VCol as any,
        {
          ...n.props,
          class: ['col-decor', 'bg-green-lighten-4', 'pa-3', 'rounded-lg', isSelected ? 'selected' : ''],
          style: {
            flex: `0 0 ${widthPercent}%`,
            maxWidth: `${widthPercent}%`
          },
          onClick: handleClick
        },
        {
          default: () => [
            h('div', { class: 'box-label position-absolute text-caption' }, `VCol (cols: ${n.props?.cols ?? ''})`),
            this.actions(n),
            h(
              Draggable as any,
              {
                modelValue: n.children,
                'onUpdate:modelValue': (v: PaletteItem[]) => {
                  n.children = v;
                  this.changed();
                },
                itemKey: 'id',
                group: { name: 'vuetify', pull: true, put: true },
                tag: 'div',
                class: ['inner-list', 'bg-green-lighten-5', 'pa-3', 'rounded-lg']
              },
              {
                default: () =>
                  n.children!.length
                    ? n.children!.map(child =>
                        h((this as any).$options, {
                          node: child,
                          selectedIds: this.$props.selectedIds,
                          onClickNode: (p: any) => this.$emit('click-node', p),
                          onRemove: (id: number) => this.$emit('remove', id),
                          onChanged: () => this.$emit('changed'),
                          onUngroup: (id: number) => this.$emit('ungroup', id),
                          key: child.id
                        })
                      )
                    : [h('div', { class: 'inner-placeholder text-caption' }, 'Put here')]
              }
            )
          ]
        }
      );
    }

    if (n.name === 'Div') {
      if (!n.children) n.children = [];
      return h(
        'div',
        {
          class: ['group-decor', 'bg-grey-lighten-4', 'pa-3', 'rounded-lg', isSelected ? 'selected' : ''],
          onClick: handleClick
        },
        [
          h('div', { class: 'box-label position-absolute text-caption' }, 'DIV'),
          this.actions(n),
          h(
            Draggable as any,
            {
              modelValue: n.children,
              'onUpdate:modelValue': (v: PaletteItem[]) => {
                n.children = v;
                this.changed();
              },
              itemKey: 'id',
              group: { name: 'vuetify', pull: true, put: true },
              tag: 'div',
              class: ['inner-list', 'bg-grey-lighten-5', 'pa-3', 'rounded-lg']
            },
            {
              default: () =>
                n.children!.length
                  ? n.children!.map(child =>
                      h((this as any).$options, {
                        node: child,
                        selectedIds: this.$props.selectedIds,
                        onClickNode: (p: any) => this.$emit('click-node', p),
                        onRemove: (id: number) => this.$emit('remove', id),
                        onChanged: () => this.$emit('changed'),
                        onUngroup: (id: number) => this.$emit('ungroup', id),
                        key: child.id
                      })
                    )
                  : [h('div', { class: 'inner-placeholder text-caption' }, 'Put here')]
            }
          )
        ]
      );
    }

    if (n.name === 'VExpansionPanels') {
      if (!n.children) n.children = [];
      return h(
        Draggable as any,
        {
          modelValue: n.children,
          'onUpdate:modelValue': (v: PaletteItem[]) => { n.children = v; this.changed(); },
          itemKey: 'id',
          group: { name: 'vuetify', pull: true, put: true },
          tag: VExpansionPanels,
          ...n.props,
          class: ['panels-decor', 'bg-deep-purple-lighten-4', 'pa-3', 'rounded-lg', isSelected ? 'selected' : ''],
          onClick: handleClick
        },
        {
          default: () => [
            h('div', { class: 'box-label position-absolute text-caption' }, 'VExpansionPanels'),
            this.actions(n),
            ...(n.children!.length
              ? n.children!.map(child =>
                  h((this as any).$options, {
                    node: child,
                    selectedIds: this.$props.selectedIds,
                    onClickNode: (p: any) => this.$emit('click-node', p),
                    onRemove: (id: number) => this.$emit('remove', id),
                    onChanged: () => this.$emit('changed'),
                    onUngroup: (id: number) => this.$emit('ungroup', id),
                    key: child.id
                  })
                )
              : [h('div', { class: 'text-grey-darken-1 text-caption py-6 text-center w-100' }, 'Перетягніть панелі сюди')]
            )
          ]
        }
      );
    }

    if (n.name === 'VExpansionPanel') {
      if (!n.children) n.children = [];
      return h(
        VExpansionPanel as any,
        {
          value: n.props?.value,
          eager: n.props?.eager,
          class: ['expansion-panel-decor', isSelected ? 'selected' : ''],
          onClick: handleClick
        },
        {
          title: () => [
            h('span', { class: 'flex-grow-1 font-weight-medium' }, n.props?.title ?? 'Panel'),
            h('span', { class: 'text-caption text-medium-emphasis me-1' }, 'VExpansionPanel'),
            h(VBtn as any, {
              icon: Icons.Delete,
              size: 'x-small',
              variant: 'text',
              density: 'comfortable',
              onClick: (e: Event) => { e.stopPropagation(); this.$emit('remove', n.id); }
            })
          ],
          default: () => [
            h(
              Draggable as any,
              {
                modelValue: n.children,
                'onUpdate:modelValue': (v: PaletteItem[]) => { n.children = v; this.changed(); },
                itemKey: 'id',
                group: { name: 'vuetify', pull: true, put: true },
                tag: 'div',
                class: ['inner-list', 'bg-deep-purple-lighten-5', 'pa-2', 'rounded-lg']
              },
              {
                default: () =>
                  n.children!.length
                    ? n.children!.map(child =>
                        h((this as any).$options, {
                          node: child,
                          selectedIds: this.$props.selectedIds,
                          onClickNode: (p: any) => this.$emit('click-node', p),
                          onRemove: (id: number) => this.$emit('remove', id),
                          onChanged: () => this.$emit('changed'),
                          onUngroup: (id: number) => this.$emit('ungroup', id),
                          key: child.id
                        })
                      )
                    : [h('div', { class: 'inner-placeholder text-caption' }, 'Put here')]
              }
            )
          ]
        }
      );
    }

    const Comp = n.type as any;
    return h(
      'div',
      {
        class: ['leaf', isSelected ? 'selected' : ''],
        onClick: handleClick,
        style: { position: 'relative' }
      },
      [this.actions(n), h(Comp, n.props, { default: () => n.props?.text })]
    );
  }
});
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
