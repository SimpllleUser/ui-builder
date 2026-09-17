<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue'
import draggable from 'vuedraggable'
import type { UiNode } from '../../../entities/ui-node/model/types'
import { useUiTreeStore } from '../../../entities/ui-node/model/store'
import { getComponentDef, getComponentSlots, PALETTE_COMPONENTS } from '../../../entities/ui-node/model/componentDefinitions'
const props = defineProps<{ node: UiNode; depth?: number }>()
const store = useUiTreeStore()
const expanded = ref(true)
const showEmptySlots = ref(false)
const renaming = ref(false)
const draftName = ref('')
const row = ref<HTMLElement>()
const renameInput = ref<HTMLInputElement>()
const selected = computed(() => store.selectedNodeIds.includes(props.node.id))
const slots = computed(() => getComponentSlots(props.node.type).filter(s => s.name !== 'default' && (props.node.id !== 'root-canvas' || props.node.slots[s.name]?.length)))
const visibleSlots = computed(() => slots.value.filter(s => showEmptySlots.value || props.node.slots[s.name]?.length))
const canMove = (event: { draggedContext: { element: UiNode }; to: HTMLElement }) => {
  const parent = store.findNodeById(event.to.dataset.parentId ?? '')
  const slot = event.to.dataset.slotName || null
  return !!parent && store.canContain(parent, slot) && !store.findNodeById(parent.id, event.draggedContext.element)
}
const depth = computed(() => props.depth ?? 0)
const hasContent = computed(() => store.canContain(props.node) || props.node.children.length > 0 || slots.value.length > 0)
const select = (e: MouseEvent | KeyboardEvent) => e.shiftKey || e.metaKey || e.ctrlKey ? store.toggleMultiSelect(props.node.id) : store.selectNode(props.node.id)
watch(() => store.selectedNodeIds, async ids => {
  if (ids.some(id => id !== props.node.id && store.findNodeById(id, props.node))) expanded.value = true
  if (ids[0] === props.node.id) { await nextTick(); row.value?.scrollIntoView({ block: 'nearest' }) }
})
const rename = async () => { draftName.value = props.node.name; renaming.value = true; await nextTick(); renameInput.value?.focus(); renameInput.value?.select() }
const finishRename = () => { if (draftName.value.trim()) props.node.name = draftName.value.trim(); store.commit(); renaming.value = false }
const keydown = (e: KeyboardEvent) => {
  if (e.target !== e.currentTarget) return
  const rows = [...(row.value?.closest('[role="tree"]')?.querySelectorAll<HTMLElement>('[role="treeitem"]') ?? [])]
  const index = rows.indexOf(row.value!)
  let target: HTMLElement | undefined
  if (e.key === 'ArrowDown') target = rows[index + 1]
  else if (e.key === 'ArrowUp') target = rows[index - 1]
  else if (e.key === 'Home') target = rows[0]
  else if (e.key === 'End') target = rows[rows.length - 1]
  else if (e.key === 'ArrowRight') { if (!expanded.value) expanded.value = true; else target = rows[index + 1] }
  else if (e.key === 'ArrowLeft') {
    if (expanded.value && hasContent.value) expanded.value = false
    else { const parent = store.findParentAndIndex(props.node.id)?.parent; target = rows.find(r => r.dataset.treeId === parent?.id) }
  } else if (e.key === 'Enter' || e.key === ' ') select(e)
  else if (e.key === 'F2') rename()
  else return
  e.preventDefault(); e.stopPropagation(); target?.focus()
}
</script>

<template>
  <div class="tree-node">
    <div ref="row" role="treeitem" :data-tree-id="node.id" :aria-label="node.name" :aria-selected="selected" :aria-level="depth + 1" :aria-expanded="hasContent ? expanded : undefined" :tabindex="store.selectedNodeId === node.id || (!store.selectedNodeId && node.id === 'root-canvas') ? 0 : -1" class="node-row" :class="{ 'node-row--selected': selected }" :style="{ paddingLeft: `${depth * 12 + 4}px` }" @click.stop="select" @keydown="keydown" @dblclick.stop="rename">
      <span v-if="node.id !== 'root-canvas'" class="drag-handle" title="Drag to reorder or move"><VIcon icon="mdi-drag-vertical" size="16" /></span>
      <button v-if="hasContent" class="tree-btn" :aria-label="`${expanded ? 'Collapse' : 'Expand'} ${node.name}`" @click.stop="expanded = !expanded"><VIcon :icon="expanded ? 'mdi-chevron-down' : 'mdi-chevron-right'" size="18" /></button>
      <span v-else class="expand-placeholder" />
      <VIcon :icon="node.id === 'root-canvas' ? 'mdi-view-dashboard-outline' : getComponentDef(node.type)?.treeIcon" size="16" />
      <input v-if="renaming" ref="renameInput" v-model="draftName" class="rename-input" aria-label="Element name" @click.stop @keydown.enter.stop.prevent="finishRename" @keydown.esc.stop="draftName = node.name; renaming = false" @blur="finishRename" />
      <span v-else class="node-label" :title="node.name">{{ node.name }}</span>
      <span class="node-actions" @click.stop @dblclick.stop>
        <VMenu v-if="store.canContain(node)">
          <template #activator="{ props: menuProps }"><button v-bind="menuProps" class="tree-btn" :aria-label="`Add inside ${node.name}`"><VIcon icon="mdi-plus" size="18" /></button></template>
          <VList density="compact"><VListItem v-for="component in PALETTE_COMPONENTS" :key="component.type" :title="component.label" @click="store.addComponent(component.type, node.id)" /></VList>
        </VMenu>
        <VMenu>
          <template #activator="{ props: menuProps }"><button v-bind="menuProps" class="tree-btn" :aria-label="`Actions for ${node.name}`"><VIcon icon="mdi-dots-horizontal" size="18" /></button></template>
          <VList density="compact">
            <VListItem title="Rename" prepend-icon="mdi-pencil" @click="rename" />
            <template v-if="node.id !== 'root-canvas'">
              <VListItem title="Move up" :disabled="!store.canReorder(node.id, -1)" prepend-icon="mdi-arrow-up" @click="store.reorderNode(node.id, -1)" />
              <VListItem title="Move down" :disabled="!store.canReorder(node.id, 1)" prepend-icon="mdi-arrow-down" @click="store.reorderNode(node.id, 1)" />
              <VListItem title="Duplicate" prepend-icon="mdi-content-copy" @click="store.duplicateNode(node.id)" />
              <VListItem title="Delete" prepend-icon="mdi-delete-outline" @click="store.deleteNode(node.id)" />
            </template>
          </VList>
        </VMenu>
      </span>
    </div>
    <div v-if="expanded && hasContent" role="group">
      <draggable v-if="store.canContain(node)" :list="node.children" item-key="id" group="ui-nodes" :move="canMove" :data-parent-id="node.id" class="tree-children" :class="{ 'tree-children--empty': !node.children.length }" :force-fallback="true" :fallback-on-body="true" handle=".drag-handle" :animation="150" ghost-class="tree-ghost" @start="store.commit()" @end="store.commit()">
        <template #item="{ element }"><SidebarTreeNode :node="element" :depth="depth + 1" /></template>
      </draggable>
      <button v-if="slots.some(s => !node.slots[s.name]?.length)" class="slots-toggle" :style="{ marginLeft: `${depth * 12 + 24}px` }" :aria-expanded="showEmptySlots" @click="showEmptySlots = !showEmptySlots">{{ showEmptySlots ? 'Hide empty slots' : 'Add slot content…' }}</button>
      <div v-for="slot in visibleSlots" :key="slot.name">
        <div class="slot-row" :style="{ paddingLeft: `${depth * 12 + 28}px` }">
          <span>{{ slot.label }}</span>
          <VMenu><template #activator="{ props: menuProps }"><button v-bind="menuProps" class="tree-btn" :aria-label="`Add to ${node.name}, ${slot.label}`"><VIcon icon="mdi-plus" size="18" /></button></template>
            <VList density="compact"><VListItem v-for="component in PALETTE_COMPONENTS" :key="component.type" :title="component.label" @click="store.appendToSlot(node.id, slot.name, store.createNode(component.type))" /></VList>
          </VMenu>
        </div>
        <draggable :model-value="node.slots[slot.name] ?? []" @update:model-value="(nodes: UiNode[]) => node.slots[slot.name] = nodes" item-key="id" group="ui-nodes" :move="canMove" :data-parent-id="node.id" :data-slot-name="slot.name" class="tree-children" :class="{ 'tree-children--empty': !node.slots[slot.name]?.length }" :force-fallback="true" :fallback-on-body="true" handle=".drag-handle" :animation="150" ghost-class="tree-ghost" @start="store.commit()" @end="store.commit()">
          <template #item="{ element }"><SidebarTreeNode :node="element" :depth="depth + 2" /></template>
        </draggable>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tree-children--empty { min-height: 30px; margin: 4px 8px 4px 28px; border: 1px dashed rgba(var(--v-theme-on-surface), .2); border-radius: 4px; }
.tree-children--empty::before { content: "Drop here"; font-size: 12px; padding: 4px 8px; opacity: .7; pointer-events: none; }
.tree-node { user-select: none; }
.node-row, .slot-row { display: flex; align-items: center; gap: 4px; min-height: 34px; padding-right: 4px; border-radius: 6px; }
.node-row { cursor: pointer; }
.node-row:hover { background: rgba(var(--v-theme-on-surface), .06); }
.node-row--selected { background: rgba(var(--v-theme-primary), .12); }
.node-row--selected .node-label { font-weight: 600; }
.node-label { flex: 1; min-width: 20px; font-size: 13px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.tree-btn { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; flex-shrink: 0; border-radius: 4px; }
.tree-btn:hover { background: rgba(var(--v-theme-primary), .12); }
.expand-placeholder { width: 28px; flex-shrink: 0; }
.drag-handle { cursor: grab; width: 16px; }
.node-actions { display: flex; margin-left: auto; }
.slot-row { font-size: 12px; color: rgb(var(--v-theme-on-surface)); justify-content: space-between; }
.slots-toggle { font-size: 12px; color: rgb(var(--v-theme-primary)); min-height: 30px; padding: 4px; text-align: left; }
.rename-input { width: 100%; min-width: 30px; background: rgb(var(--v-theme-background)); border: 1px solid rgb(var(--v-theme-primary)); padding: 3px; font-size: 13px; }
:global(.tree-ghost) { opacity: .4; background: rgba(var(--v-theme-primary), .1); }
</style>
