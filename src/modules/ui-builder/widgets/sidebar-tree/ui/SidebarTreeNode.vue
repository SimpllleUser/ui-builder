<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import draggable from 'vuedraggable'
import type { UiNode } from '../../../entities/ui-node/model/types'
import { useUiTreeStore } from '../../../entities/ui-node/model/store'
import { getComponentDef, getComponentSlots, PALETTE_COMPONENTS, COMPONENT_DEFS } from '../../../entities/ui-node/model/componentDefinitions'
import { Icons } from '../../../../../shared/icons'

const props = defineProps<{
  node: UiNode
  depth?: number
}>()

const store = useUiTreeStore()
const { selectedNodeIds } = storeToRefs(store)

const isLeafNode = computed(() => getComponentDef(props.node.type)?.isLeaf ?? false)

const handleNodeClick = (e: MouseEvent) => {
  if (e.shiftKey) store.toggleMultiSelect(props.node.id)
  else store.selectNode(props.node.id)
}

const availableComponents = PALETTE_COMPONENTS

const componentSlots = computed(() => getComponentSlots(props.node.type))
const hasDefaultSlot = computed(() => componentSlots.value.some(s => s.name === 'default'))
const namedSlots = computed(() => componentSlots.value.filter(s => s.name !== 'default'))

const isChildrenExpanded = ref(true)
const isSlotsExpanded = ref(true)
const slotsExpanded = ref<Record<string, boolean>>({})

const isSlotExpanded = (name: string) => slotsExpanded.value[name] !== false
const toggleSlot = (name: string) => {
  slotsExpanded.value[name] = !isSlotExpanded(name)
}

const slotChildren = (name: string): any[] => props.node.slots?.[name] ?? []

const d = computed(() => props.depth ?? 0)
const nodeIndent = computed(() => `${d.value * 14 + 4}px`)
const sectionIndent = computed(() => `${d.value * 14 + 6}px`)
const slotIndent = computed(() => `${d.value * 14 + 22}px`)

const getIcon = (type: string) => {
  if (type === 'root-canvas') return 'mdi-view-dashboard-outline'
  return COMPONENT_DEFS[type]?.treeIcon ?? 'mdi-cube-outline'
}

const onAdd = (type: string) => {
  const newNode = store.createNode(type)
  store.appendChild(props.node.id, newNode)
  store.selectNode(newNode.id)
}

const onAddToSlot = (slotName: string, type: string) => {
  const newNode = store.createNode(type)
  store.appendToSlot(props.node.id, slotName, newNode)
  store.selectNode(newNode.id)
}
</script>

<template>
  <div class="tree-node">
    <div
      class="node-row"
      :class="{ 'node-row--selected': selectedNodeIds.includes(node.id) }"
      :style="{ paddingLeft: nodeIndent }"
      @click.stop="handleNodeClick"
    >
      <!-- Drag handle (hidden for root) -->
      <span v-if="node.id !== 'root-canvas'" class="drag-handle" @click.stop>
        <VIcon icon="mdi-drag-vertical" size="13" class="drag-handle-icon" />
      </span>
      <span v-else class="drag-handle drag-handle--placeholder" />

      <!-- Expand/collapse toggle -->
      <button
        v-if="node.children.length > 0"
        class="tree-btn expand-btn"
        @click.stop="isChildrenExpanded = !isChildrenExpanded"
      >
        <VIcon :icon="isChildrenExpanded ? Icons.ChevronDown : Icons.ChevronRight" size="13" />
      </button>
      <span v-else class="expand-placeholder" />

      <VIcon :icon="getIcon(node.type)" size="15" class="node-type-icon" />
      <span class="node-label">{{ node.name }}</span>

      <span class="node-actions" @click.stop>
        <VMenu v-if="hasDefaultSlot" location="bottom end">
          <template #activator="{ props: mp }">
            <button v-bind="mp" class="tree-btn action-btn">
              <VIcon :icon="Icons.Plus" size="13" />
            </button>
          </template>
          <VList density="compact" min-width="160">
            <VListItem
              v-for="comp in availableComponents"
              :key="comp.type"
              :title="comp.label"
              density="compact"
              class="text-caption"
              @click="onAdd(comp.type)"
            />
          </VList>
        </VMenu>
        <button
          v-if="node.id !== 'root-canvas'"
          class="tree-btn action-btn"
          title="Duplicate"
          @click.stop="store.duplicateNode(node.id)"
        >
          <VIcon :icon="Icons.Copy" size="13" />
        </button>
        <button
          v-if="node.id !== 'root-canvas'"
          class="tree-btn action-btn action-btn--delete"
          title="Delete"
          @click.stop="store.deleteNode(node.id)"
        >
          <VIcon :icon="Icons.DeleteOutline" size="13" />
        </button>
      </span>
    </div>

    <!-- Children (draggable) -->
    <VExpandTransition>
      <div v-if="!isLeafNode && node.children.length > 0 && isChildrenExpanded">
        <draggable
          :list="node.children"
          item-key="id"
          group="ui-nodes"
          handle=".drag-handle"
          :animation="150"
          ghost-class="tree-ghost"
          chosen-class="tree-chosen"
          @end="store.commit()"
        >
          <template #item="{ element: child }">
            <SidebarTreeNode :node="child" :depth="d + 1" />
          </template>
        </draggable>
      </div>
    </VExpandTransition>

    <!-- Named slots -->
    <template v-if="namedSlots.length > 0">
      <div
        class="section-row"
        :style="{ paddingLeft: sectionIndent }"
        @click.stop="isSlotsExpanded = !isSlotsExpanded"
      >
        <button class="tree-btn expand-btn">
          <VIcon :icon="isSlotsExpanded ? Icons.ChevronDown : Icons.ChevronRight" size="11" />
        </button>
        <VIcon icon="mdi-code-braces" size="13" class="mr-1 section-icon" />
        <span class="section-label">Slots</span>
      </div>

      <VExpandTransition>
        <div v-if="isSlotsExpanded">
          <template v-for="slot in namedSlots" :key="slot.name">
            <div class="slot-row" :style="{ paddingLeft: slotIndent }">
              <VIcon icon="mdi-pound" size="12" class="mr-1 text-medium-emphasis" />
              <span class="slot-label">{{ slot.name }}</span>
              <span class="node-actions" @click.stop>
                <VMenu location="bottom end">
                  <template #activator="{ props: mp }">
                    <button v-bind="mp" class="tree-btn action-btn">
                      <VIcon :icon="Icons.Plus" size="13" />
                    </button>
                  </template>
                  <VList density="compact" min-width="160">
                    <VListItem
                      v-for="comp in availableComponents"
                      :key="comp.type"
                      :title="comp.label"
                      density="compact"
                      class="text-caption"
                      @click="onAddToSlot(slot.name, comp.type)"
                    />
                  </VList>
                </VMenu>
              </span>
            </div>

            <div v-if="slotChildren(slot.name).length > 0">
              <draggable
                :list="slotChildren(slot.name)"
                item-key="id"
                group="ui-nodes"
                handle=".drag-handle"
                :animation="150"
                ghost-class="tree-ghost"
                chosen-class="tree-chosen"
                @end="store.commit()"
              >
                <template #item="{ element: child }">
                  <SidebarTreeNode :node="child" :depth="d + 2" />
                </template>
              </draggable>
            </div>
          </template>
        </div>
      </VExpandTransition>
    </template>
  </div>
</template>

<style scoped>
.tree-node {
  display: flex;
  flex-direction: column;
  user-select: none;
}

.node-row,
.section-row,
.slot-row {
  display: flex;
  align-items: center;
  gap: 2px;
  border-radius: 4px;
  cursor: pointer;
  min-height: 22px;
  padding-right: 4px;
}

.node-row:hover,
.section-row:hover,
.slot-row:hover {
  background: rgba(var(--v-theme-on-surface), 0.06);
}

.node-row:hover .node-actions,
.slot-row:hover .node-actions {
  opacity: 1;
}

.node-row--selected {
  background: rgba(var(--v-theme-primary), 0.1);
}
.node-row--selected .node-label {
  color: rgb(var(--v-theme-primary));
  font-weight: 600;
}

/* ─── Drag handle ─────────────────────────────────────────────────────────── */

.drag-handle {
  flex-shrink: 0;
  width: 14px;
  height: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
  opacity: 0;
  transition: opacity 0.1s;
  color: rgba(var(--v-theme-on-surface), 0.4);
  border-radius: 2px;
}

.drag-handle--placeholder {
  cursor: default;
}

.drag-handle:not(.drag-handle--placeholder):active {
  cursor: grabbing;
}

.node-row:hover .drag-handle:not(.drag-handle--placeholder) {
  opacity: 1;
}

/* ─── Draggable ghost / chosen ────────────────────────────────────────────── */

:global(.tree-ghost) {
  opacity: 0.35;
  background: rgba(var(--v-theme-primary), 0.08) !important;
  border-radius: 4px;
  outline: 1px dashed rgba(var(--v-theme-primary), 0.4);
}

:global(.tree-chosen) {
  background: rgba(var(--v-theme-primary), 0.06);
  border-radius: 4px;
}

/* ─── Other row elements ──────────────────────────────────────────────────── */

.expand-btn,
.expand-placeholder {
  flex-shrink: 0;
  width: 16px;
  height: 16px;
}

.tree-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: none;
  padding: 0;
  cursor: pointer;
  border-radius: 3px;
  color: rgba(var(--v-theme-on-surface), 0.55);
  line-height: 1;
}
.tree-btn:hover {
  background: rgba(var(--v-theme-on-surface), 0.1);
  color: rgb(var(--v-theme-on-surface));
}

.action-btn {
  width: 16px;
  height: 16px;
}

.action-btn--delete:hover {
  background: rgba(var(--v-theme-error), 0.12);
  color: rgb(var(--v-theme-error));
}

.node-type-icon {
  flex-shrink: 0;
  opacity: 0.65;
}

.node-label {
  flex: 1;
  min-width: 0;
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.node-actions {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.1s;
}

.section-icon {
  opacity: 0.5;
}

.section-label {
  flex: 1;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  opacity: 0.4;
}

.slot-label {
  flex: 1;
  font-size: 11px;
  font-style: italic;
  opacity: 0.65;
}
</style>
