<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { isNodeEmpty, useUiTreeStore } from '../../../entities/ui-node'
import { mirrorStyles } from '../../../../../shared/lib/mirrorStyles'
import { PREVIEW_FRAME_STYLE } from '../model/previewFrameStyle'
import PreviewPage from './PreviewPage.vue'

const PREVIEW_HEIGHT = 800

/** The page as visitors see it, in a frame as wide as the chosen device. */
const props = defineProps<{ viewport: number; zoom: number; previewOnly?: boolean }>()
const emit = defineEmits<{ exit: [] }>()
const store = useUiTreeStore()
const previewTarget = ref<HTMLElement | null>(null)
// In Preview the page itself may be empty even when a shared layout fills the screen around it.
const previewPageEmpty = computed(() => isNodeEmpty(store.previewPage.root))
// The frame follows the editor's styles, so theme changes reach an open preview.
let stopMirroringStyles = () => {}
onBeforeUnmount(() => stopMirroringStyles())
const loadPreview = (event: Event) => {
  const frame = event.target
  if (!(frame instanceof HTMLIFrameElement) || !frame.contentDocument) return
  const doc = frame.contentDocument
  stopMirroringStyles()
  stopMirroringStyles = mirrorStyles(document, doc)
  const reset = doc.createElement('style')
  reset.textContent = PREVIEW_FRAME_STYLE
  doc.head.appendChild(reset)
  doc.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !props.previewOnly) emit('exit')
  })
  previewTarget.value = doc.getElementById('preview-root')
}
</script>

<template>
  <div class="preview-workspace">
    <VAlert
      v-if="previewPageEmpty"
      type="info"
      variant="tonal"
      density="compact"
      class="preview-empty"
      title="This page has no elements yet"
    >
      Preview shows what you build. Go back to the editor and add a component or start from a template.
      <template v-if="!previewOnly" #append>
        <VBtn size="small" variant="text" @click="emit('exit')">Back to editor</VBtn>
      </template>
    </VAlert>
    <div
      class="preview-size"
      :style="{ width: `${(viewport * zoom) / 100}px`, height: `${(PREVIEW_HEIGHT * zoom) / 100}px` }"
    >
      <iframe
        title="Page preview"
        :width="viewport"
        :height="PREVIEW_HEIGHT"
        srcdoc="<!doctype html><html><head><meta name='viewport' content='width=device-width, initial-scale=1'></head><body><div id='preview-root'></div></body></html>"
        :style="{ transform: `scale(${zoom / 100})` }"
        @load="loadPreview"
      />
    </div>
    <Teleport v-if="previewTarget" :to="previewTarget">
      <PreviewPage />
    </Teleport>
  </div>
</template>

<style scoped>
.preview-workspace {
  flex: 1;
  overflow: auto;
  padding: 20px;
  background: rgb(var(--v-theme-surface-light));
}
.preview-empty {
  max-width: 640px;
  margin: 0 auto 12px;
}
.preview-size {
  margin-inline: auto;
}
.preview-size iframe {
  display: block;
  border: none;
  transform-origin: top left;
  background: rgb(var(--v-theme-background));
  box-shadow: 0 3px 18px #0002;
}
@media (max-width: 600px) {
  .preview-workspace {
    padding: 12px;
  }
}
</style>
