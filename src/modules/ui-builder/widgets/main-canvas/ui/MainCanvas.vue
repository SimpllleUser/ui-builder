<script setup lang="ts">
import { platformModifierKey } from '../../../../../shared/lib/platform'
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { storeToRefs } from 'pinia'
import {
  isNodeEmpty,
  useUiTreeStore,
  type TemplateKind,
  NodeRenderer,
  canvasDragTargetId,
  BREAKPOINT_WIDTHS,
} from '../../../entities/ui-node'
import { ThemeDefaultsProvider } from '../../../../theme/entities/theme-settings'
import HoverBadge from './HoverBadge.vue'
import SelectionToolbar from './SelectionToolbar.vue'
import BreakpointSwitcher from './BreakpointSwitcher.vue'
import PreviewMessage from './PreviewMessage.vue'
import PreviewToolbar from './PreviewToolbar.vue'
import PreviewFrame from './PreviewFrame.vue'
import CanvasEmptyState from './CanvasEmptyState.vue'
import { usePreviewStyles } from '../model/usePreviewStyles'
import MeasureOverlay from './MeasureOverlay.vue'
import ResizeHandles from './ResizeHandles.vue'
/** `previewOnly` shows the project without any way back to editing it. */
const props = defineProps<{ previewOnly?: boolean }>()
const emit = defineEmits<{ 'open-components': []; 'add-template': [kind: TemplateKind] }>()
const store = useUiTreeStore()
const { rootNode, canUndo, canRedo, isPreviewMode, selectedNodeIds } = storeToRefs(store)
const modifierKey = platformModifierKey()
const viewport = ref(1280)
const zoom = ref(100)
const canvas = ref<HTMLElement>()
const empty = computed(() => isNodeEmpty(rootNode.value))
// The canvas stands for the screen size being edited, and Preview opens on the same one.
const canvasWidth = computed(() =>
  store.editingBreakpoint ? `${BREAKPOINT_WIDTHS[store.editingBreakpoint]}px` : undefined,
)
const previewStyles = usePreviewStyles()
onMounted(() => {
  if (props.previewOnly) store.startPreview()
})
onBeforeUnmount(() => {
  if (props.previewOnly) isPreviewMode.value = false
})
watch(isPreviewMode, on => {
  if (on && store.editingBreakpoint) viewport.value = BREAKPOINT_WIDTHS[store.editingBreakpoint]
})
watch(
  () => store.selectedNodeId,
  async id => {
    if (!id || isPreviewMode.value) return
    await nextTick()
    canvas.value
      ?.querySelector<HTMLElement>(`[data-node-id="${CSS.escape(id)}"]`)
      ?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  },
)
const leaveCanvas = (event: DragEvent) => {
  if (!(event.currentTarget as Element).contains(event.relatedTarget as Node)) canvasDragTargetId.value = null
}
</script>

<template>
  <div class="canvas-workspace">
    <div class="canvas-toolbar">
      <div class="canvas-toolbar__title">
        {{ isPreviewMode ? 'Preview' : selectedNodeIds.length ? `${selectedNodeIds.length} selected` : 'Canvas' }}
      </div>
      <PreviewToolbar v-if="isPreviewMode" v-model:viewport="viewport" v-model:zoom="zoom" />
      <BreakpointSwitcher v-if="!isPreviewMode" />
      <div class="canvas-toolbar__actions">
        <template v-if="!isPreviewMode">
          <VBtn
            icon="mdi-undo"
            size="small"
            variant="text"
            :disabled="!canUndo"
            :title="`Undo (${modifierKey} Z)`"
            aria-label="Undo"
            @click="store.undo()"
          />
          <VBtn
            icon="mdi-redo"
            size="small"
            variant="text"
            :disabled="!canRedo"
            :title="`Redo (${modifierKey} Shift Z)`"
            aria-label="Redo"
            @click="store.redo()"
          />
        </template>
        <VBtn
          v-if="!previewOnly"
          :prepend-icon="isPreviewMode ? 'mdi-pencil-outline' : 'mdi-eye-outline'"
          size="small"
          :variant="isPreviewMode ? 'flat' : 'tonal'"
          color="primary"
          data-tour="preview"
          :title="
            isPreviewMode
              ? 'Back to the editor (Esc)'
              : 'Try the page: clicks, conditions and inputs work (Esc returns)'
          "
          @click="isPreviewMode = !isPreviewMode"
        >
          {{ isPreviewMode ? 'Back to editor' : 'Preview' }}
        </VBtn>
      </div>
    </div>
    <!-- A component is previewed on the canvas itself: only the mode changes, the panels and the canvas stay. -->
    <PreviewFrame
      v-if="isPreviewMode && !store.editingPrefab"
      :viewport="viewport"
      :zoom="zoom"
      :preview-only="previewOnly"
      @exit="isPreviewMode = false"
    />
    <div
      v-else
      ref="canvas"
      class="main-canvas-wrapper"
      data-tour="canvas"
      @click="store.selectNode(null)"
      @dragleave="leaveCanvas"
    >
      <CanvasEmptyState
        v-if="empty && !isPreviewMode"
        @open-components="emit('open-components')"
        @add-template="kind => emit('add-template', kind)"
      />
      <VAlert
        v-if="store.editingPrefab && !isPreviewMode"
        type="info"
        variant="tonal"
        density="compact"
        class="mb-3"
        icon="mdi-puzzle-outline"
        @click.stop
      >
        Editing component <strong>{{ store.editingPrefab.name }}</strong>. Write <code v-pre>{{ props.name }}</code> to
        add a parameter. Every instance follows these changes; Undo takes them back.
        <VBtn size="small" variant="text" class="ml-2" @click="store.stopEditingPrefab()">Done</VBtn>
      </VAlert>
      <component :is="'style'">{{ previewStyles }}</component>
      <div class="canvas-device" :style="{ width: isPreviewMode ? undefined : canvasWidth }">
        <ThemeDefaultsProvider>
          <NodeRenderer
            :key="`${store.editingPrefab?.prefabId}:${isPreviewMode ? store.previewRun : 'edit'}`"
            :node="isPreviewMode ? store.previewRoot : rootNode"
            :in-page="!!store.editingPrefab"
          />
        </ThemeDefaultsProvider>
      </div>
      <PreviewMessage v-if="isPreviewMode" />
      <template v-if="!isPreviewMode">
        <HoverBadge :container="canvas" />
        <SelectionToolbar :container="canvas" />
        <ResizeHandles :container="canvas" />
        <MeasureOverlay :container="canvas" />
      </template>
      <p v-if="empty && !isPreviewMode" class="drop-hint">Drop components in the outlined area above.</p>
    </div>
  </div>
</template>

<style>
.canvas-workspace {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}
.canvas-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  padding: 8px 12px;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.15);
  background: rgb(var(--v-theme-surface));
  flex-shrink: 0;
}
.canvas-toolbar__title {
  font-size: 13px;
  font-weight: 600;
}
.canvas-toolbar__actions {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
}
.main-canvas-wrapper {
  position: relative;
  flex: 1;
  overflow: auto;
  padding: 20px;
  background: rgb(var(--v-theme-surface-light));
  /* Shift-clicking elements must not select their text, which Ctrl/⌘ C would then copy instead of them. */
  user-select: none;
}
.canvas-device {
  margin-inline: auto;
}
.drop-hint {
  font-size: 14px;
  color: rgb(var(--v-theme-on-surface));
  opacity: 0.75;
  text-align: center;
  margin-top: 12px;
}
.main-canvas-wrapper .v-application__wrap {
  min-height: 520px;
}
.main-canvas-wrapper .v-layout {
  position: relative;
}
@media (max-width: 600px) {
  .main-canvas-wrapper {
    padding: 12px;
  }
}
</style>
