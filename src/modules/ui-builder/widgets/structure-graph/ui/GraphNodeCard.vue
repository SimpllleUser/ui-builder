<script setup lang="ts">
import { computed } from 'vue'
import { Handle, Position } from '@vue-flow/core'
import { BEHAVIOR_ICONS } from '../../../entities/ui-node'
import { GraphDirection, type GraphNodeData } from '../model/graphLayout'

/** One element of the structure as a card: its icon, its name and a tiny icon for each thing it does. */
const props = defineProps<{ data: GraphNodeData; selected: boolean }>()

// Edges leave from the side the tree grows towards.
const entering = computed(() => (props.data.direction === GraphDirection.Vertical ? Position.Top : Position.Left))
const leaving = computed(() => (props.data.direction === GraphDirection.Vertical ? Position.Bottom : Position.Right))
</script>

<template>
  <div
    class="graph-node"
    :class="{
      'graph-node--selected': selected,
      'graph-node--section': data.isSection,
      'graph-node--slot': data.isSlot,
    }"
    :title="data.type || undefined"
  >
    <Handle v-if="!data.isSection" type="target" :position="entering" class="graph-node__handle" />
    <VIcon :icon="data.icon" size="16" class="graph-node__icon" aria-hidden="true" />
    <span class="graph-node__label">{{ data.label }}</span>
    <span v-if="data.behaviors.length" class="graph-node__behaviors">
      <span v-for="note in data.behaviors" :key="note.badge" :title="note.description">
        <VIcon :icon="BEHAVIOR_ICONS[note.badge]" size="14" aria-hidden="true" />
      </span>
    </span>
    <Handle type="source" :position="leaving" class="graph-node__handle" />
  </div>
</template>

<style scoped>
.graph-node {
  display: flex;
  box-sizing: border-box;
  width: 190px;
  height: 40px;
  align-items: center;
  gap: 6px;
  padding: 0 10px;
  border: 1px solid rgba(var(--v-border-color), 0.35);
  border-radius: 8px;
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
  font-size: 13px;
  cursor: pointer;
}
.graph-node:hover {
  border-color: rgb(var(--v-theme-primary));
}
.graph-node--selected {
  border-color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.14);
  box-shadow: 0 0 0 2px rgba(var(--v-theme-primary), 0.35);
}
.graph-node--section {
  border-color: rgb(var(--v-theme-primary));
  background: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-on-primary));
  font-weight: 600;
  cursor: default;
}
.graph-node--slot {
  border-style: dashed;
  font-style: italic;
}
.graph-node__icon {
  flex-shrink: 0;
  opacity: 0.8;
}
.graph-node__label {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.graph-node__behaviors {
  display: flex;
  flex-shrink: 0;
  gap: 2px;
  color: rgb(var(--v-theme-info));
}
.graph-node__handle {
  width: 6px;
  height: 6px;
  opacity: 0;
}
</style>
