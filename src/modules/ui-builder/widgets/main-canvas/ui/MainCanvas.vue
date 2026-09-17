<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useUiTreeStore } from '../../../entities/ui-node/model/store'
import NodeRenderer, { canvasDragTargetId } from '../../../entities/ui-node/ui/NodeRenderer'

const store = useUiTreeStore()
const { rootNode, canUndo, canRedo, isPreviewMode } = storeToRefs(store)

const onCanvasDragLeave = (e: DragEvent) => {
  const canvas = e.currentTarget as Element
  if (!canvas?.contains(e.relatedTarget as Node)) {
    canvasDragTargetId.value = null
  }
}
</script>

<template>
  <div class="d-flex flex-column h-100">

    <div class="canvas-toolbar">
      <span class="canvas-toolbar__title">
        {{ isPreviewMode ? 'Preview' : 'Canvas' }}
      </span>
      <div class="canvas-toolbar__actions">
        <template v-if="!isPreviewMode">
          <VBtn
            :icon="'mdi-undo'"
            size="small"
            variant="text"
            :disabled="!canUndo"
            title="Undo (Ctrl+Z)"
            @click="store.undo()"
          />
          <VBtn
            :icon="'mdi-redo'"
            size="small"
            variant="text"
            :disabled="!canRedo"
            title="Redo (Ctrl+Y)"
            @click="store.redo()"
          />
          <VDivider vertical class="mx-1" />
        </template>
        <VBtn
          :icon="isPreviewMode ? 'mdi-pencil-outline' : 'mdi-eye-outline'"
          size="small"
          :variant="isPreviewMode ? 'tonal' : 'text'"
          :color="isPreviewMode ? 'primary' : undefined"
          :title="isPreviewMode ? 'Back to editor' : 'Preview'"
          @click="isPreviewMode = !isPreviewMode"
        />
      </div>
    </div>

    <div
      class="main-canvas-wrapper flex-grow-1 pa-10 overflow-y-auto"
      :class="isPreviewMode ? 'bg-white' : 'bg-grey-lighten-4'"
      @click="isPreviewMode ? undefined : store.selectNode(null)"
      @dragleave="isPreviewMode ? undefined : onCanvasDragLeave"
    >
      <NodeRenderer :node="rootNode" />
    </div>

  </div>
</template>

<style>
/* ─── Canvas toolbar ──────────────────────────────────────────────────────── */

.canvas-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 12px;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  background: rgb(var(--v-theme-surface));
  flex-shrink: 0;
}

.canvas-toolbar__title {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  opacity: 0.5;
}

.canvas-toolbar__actions {
  display: flex;
  gap: 2px;
}

/* ─── Element outlines ───────────────────────────────────────────────────── */

.ui-builder-element {
  outline: 1px dashed rgba(0, 0, 0, 0.1);
  min-height: 20px;
  position: relative;
}
.ui-builder-element.is-selected {
  outline: 2px solid rgb(var(--v-theme-primary)) !important;
}
.ui-builder-element.is-drag-over {
  outline: 2px dashed rgb(var(--v-theme-primary)) !important;
  background: rgba(var(--v-theme-primary), 0.06) !important;
}
.v-card.ui-builder-element { min-height: 80px; margin-bottom: 10px; }
.v-card-title.ui-builder-element, .v-card-text.ui-builder-element { min-height: 30px; }

.v-row.ui-builder-element {
  min-height: 80px;
  background-color: rgba(var(--v-theme-primary), 0.02);
  outline: 1px solid rgba(var(--v-theme-primary), 0.1);
  margin: 4px 0 !important;
}

.v-col.ui-builder-element {
  min-height: 60px;
  background-color: rgba(var(--v-theme-primary), 0.05);
  outline: 1px dashed rgba(var(--v-theme-primary), 0.2);
  transition: all 0.2s;
}

.v-col.ui-builder-element:hover {
  background-color: rgba(var(--v-theme-primary), 0.08);
}

div.ui-builder-element {
  min-height: 40px;
  min-width: 40px;
  border: 1px dashed rgba(0, 0, 0, 0.05);
  margin: 4px;
}
</style>
