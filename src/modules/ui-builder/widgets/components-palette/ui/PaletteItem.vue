<script setup lang="ts">
import { computed } from 'vue'
import { type ComponentDef } from '../../../entities/ui-node'

const props = defineProps<{ component: ComponentDef; favorite: boolean; target: string }>()
const emit = defineEmits<{ add: []; 'toggle-favorite': []; dragstart: [event: DragEvent] }>()
const favoriteLabel = computed(
  () => `${props.favorite ? 'Remove' : 'Add'} ${props.component.label} ${props.favorite ? 'from' : 'to'} favorites`,
)
</script>

<template>
  <div class="palette-cell" role="listitem">
    <button
      type="button"
      class="palette-item"
      draggable="true"
      :aria-label="`Add ${component.label} to ${target}`"
      :title="`Add ${component.label} to ${target}`"
      @click="emit('add')"
      @dragstart="emit('dragstart', $event)"
    >
      <VIcon :icon="component.treeIcon" size="20" aria-hidden="true" /><span>{{ component.label }}</span>
    </button>
    <button
      type="button"
      class="palette-star"
      :class="{ 'palette-star--on': favorite }"
      :aria-pressed="favorite"
      :aria-label="favoriteLabel"
      :title="favorite ? 'Remove from favorites' : 'Add to favorites'"
      @click="emit('toggle-favorite')"
    >
      <VIcon :icon="favorite ? 'mdi-star' : 'mdi-star-outline'" size="14" aria-hidden="true" />
    </button>
  </div>
</template>

<style scoped>
.palette-cell {
  position: relative;
}
.palette-item {
  display: flex;
  width: 100%;
  min-height: 64px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 7px 5px;
  gap: 5px;
  border: 1px solid rgba(var(--v-border-color), 0.2);
  border-radius: 8px;
  background: rgb(var(--v-theme-surface));
  cursor: grab;
}
.palette-item:hover {
  border-color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.07);
}
.palette-item:active {
  cursor: grabbing;
}
.palette-item span {
  max-width: 100%;
  font-size: 12px;
  line-height: 1.3;
  text-align: center;
  overflow-wrap: anywhere;
}
.palette-star {
  position: absolute;
  top: 3px;
  right: 3px;
  display: flex;
  padding: 2px;
  border-radius: 6px;
  color: rgba(var(--v-theme-on-surface), 0.5);
  opacity: 0;
}
.palette-cell:hover .palette-star,
.palette-star:focus-visible,
.palette-star--on {
  opacity: 1;
}
/* A screen without hover would never show the star, so it is always visible there. */
@media (hover: none) {
  .palette-star {
    opacity: 1;
  }
}
.palette-star--on {
  color: rgb(var(--v-theme-warning));
}
.palette-star:hover {
  background: rgba(var(--v-theme-on-surface), 0.08);
}
</style>
