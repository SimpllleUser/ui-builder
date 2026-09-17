<script setup lang="ts">
import { PALETTE_COMPONENTS } from '../../../entities/ui-node/model/componentDefinitions'

const onDragStart = (e: DragEvent, type: string) => {
  e.dataTransfer?.setData('componenttype', type)
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'copy'
}
</script>

<template>
  <div class="components-palette">
    <div class="palette-header">Components</div>
    <div class="palette-grid">
      <div
        v-for="comp in PALETTE_COMPONENTS"
        :key="comp.type"
        class="palette-item"
        draggable="true"
        :title="comp.label"
        @dragstart="onDragStart($event, comp.type)"
      >
        <VIcon :icon="comp.treeIcon" size="16" class="palette-item__icon" />
        <span class="palette-item__label">{{ comp.label }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.components-palette {
  padding: 6px 8px 10px;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  flex-shrink: 0;
}

.palette-header {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  opacity: 0.45;
  padding: 0 4px;
  margin-bottom: 6px;
}

.palette-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.palette-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 50px;
  border-radius: 6px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  cursor: grab;
  background: rgb(var(--v-theme-surface));
  transition: background 0.12s, border-color 0.12s, box-shadow 0.12s;
  user-select: none;
  gap: 3px;
}

.palette-item:hover {
  background: rgba(var(--v-theme-primary), 0.07);
  border-color: rgba(var(--v-theme-primary), 0.4);
  box-shadow: 0 1px 4px rgba(var(--v-theme-primary), 0.08);
}

.palette-item:active {
  cursor: grabbing;
}

.palette-item__icon {
  opacity: 0.7;
}

.palette-item__label {
  font-size: 9px;
  text-align: center;
  opacity: 0.65;
  line-height: 1.2;
  max-width: 52px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
