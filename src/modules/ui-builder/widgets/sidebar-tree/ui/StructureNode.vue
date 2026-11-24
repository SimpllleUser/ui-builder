<script setup lang="ts">
import { ref } from 'vue'
import { BEHAVIOR_ICONS, type OutlineNode } from '../../../entities/ui-node'

/** One row of the structure: an icon, a name, and a tiny icon for each thing the element does. Deep branches start folded. */
const props = defineProps<{ node: OutlineNode; depth: number; selectedIds: string[] }>()
defineEmits<{ select: [id: string] }>()

const OPEN_DEPTH = 2
const expanded = ref(props.depth < OPEN_DEPTH)
const hasChildren = props.node.children.length > 0
</script>

<template>
  <li>
    <div
      class="node"
      :class="{ 'node--selected': selectedIds.includes(node.id), 'node--slot': node.isSlot }"
      :title="node.type || undefined"
    >
      <button
        v-if="hasChildren"
        class="node__toggle"
        :aria-expanded="expanded"
        :aria-label="`${expanded ? 'Collapse' : 'Expand'} ${node.label}`"
        @click="expanded = !expanded"
      >
        <VIcon :icon="expanded ? 'mdi-chevron-down' : 'mdi-chevron-right'" size="16" aria-hidden="true" />
      </button>
      <span v-else class="node__toggle" />
      <VIcon :icon="node.icon" size="16" class="node__icon" aria-hidden="true" />
      <component
        :is="node.isSlot ? 'span' : 'button'"
        class="node__label"
        @click="!node.isSlot && $emit('select', node.id)"
      >
        {{ node.label }}
      </component>
      <span v-if="node.behaviors.length" class="node__behaviors">
        <span v-for="note in node.behaviors" :key="note.badge" :title="note.description">
          <VIcon :icon="BEHAVIOR_ICONS[note.badge]" size="14" aria-hidden="true" />
          <span class="sr-only">{{ note.description }}</span>
        </span>
      </span>
    </div>
    <ul v-if="hasChildren && expanded" class="children">
      <StructureNode
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :depth="depth + 1"
        :selected-ids="selectedIds"
        @select="$emit('select', $event)"
      />
    </ul>
  </li>
</template>

<style scoped>
li {
  list-style: none;
}
.node {
  display: flex;
  align-items: center;
  gap: 4px;
  min-height: 28px;
  padding-right: 6px;
  border-radius: 6px;
}
.node:hover {
  background: rgba(var(--v-theme-on-surface), 0.06);
}
.node--selected {
  background: rgba(var(--v-theme-primary), 0.14);
}
.node__toggle {
  display: inline-flex;
  width: 18px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
}
.node__icon {
  flex-shrink: 0;
  opacity: 0.7;
}
.node__label {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  font-size: 13px;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.node--slot .node__label {
  font-style: italic;
  opacity: 0.7;
}
.node__behaviors {
  display: flex;
  flex-shrink: 0;
  gap: 2px;
  color: rgb(var(--v-theme-info));
}
.children {
  margin: 0 0 0 9px;
  padding: 0 0 0 9px;
  border-left: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
</style>
