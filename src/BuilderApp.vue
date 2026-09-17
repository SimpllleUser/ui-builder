<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { useMediaQuery, useStorage } from '@vueuse/core'
import MainCanvas from './modules/ui-builder/widgets/main-canvas/ui/MainCanvas.vue'
import SidebarTree from './modules/ui-builder/widgets/sidebar-tree/ui/SidebarTree.vue'
import PropertyPanel from './modules/ui-builder/widgets/property-panel/ui/PropertyPanel.vue'
import { useUiTreeStore } from './modules/ui-builder/entities/ui-node/model/store'

const store = useUiTreeStore()
const narrow = useMediaQuery('(max-width: 1100px)')
const leftOpen = ref(true)
const rightOpen = ref(true)
const leftWidth = useStorage('ui-builder:left-width', 300)
const rightWidth = useStorage('ui-builder:right-width', 340)
const importInput = ref<HTMLInputElement>()
const snackbar = ref(false)
watch(() => store.notice, value => { if (value) snackbar.value = true }, { immediate: true })
watch(narrow, value => { leftOpen.value = !value; rightOpen.value = !value }, { immediate: true })
const togglePanel = (side: 'left' | 'right') => {
  if (side === 'left') { leftOpen.value = !leftOpen.value; if (narrow.value) rightOpen.value = false }
  else { rightOpen.value = !rightOpen.value; if (narrow.value) leftOpen.value = false }
}
const resize = (side: 'left' | 'right', delta: number) => {
  const width = side === 'left' ? leftWidth : rightWidth
  width.value = Math.min(480, Math.max(260, width.value + delta))
}
let stopResize: (() => void) | undefined
const startResize = (event: PointerEvent, side: 'left' | 'right') => {
  event.preventDefault()
  stopResize?.()
  let x = event.clientX
  const move = (e: PointerEvent) => { resize(side, (e.clientX - x) * (side === 'left' ? 1 : -1)); x = e.clientX }
  const stop = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', stop); window.removeEventListener('pointercancel', stop) }
  stopResize = stop
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', stop, { once: true })
  window.addEventListener('pointercancel', stop, { once: true })
}
const exportPage = () => {
  const url = URL.createObjectURL(new Blob([store.exportDocument()], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url; a.download = 'ui-builder-page.json'; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
const importPage = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  try {
    if (file.size > 5_000_000) throw new Error('Choose a document smaller than 5 MB.')
    store.importDocument(await file.text())
  } catch (error) { store.notice = error instanceof Error ? error.message : 'Could not import this document.' }
  input.value = ''
}
const onKey = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    if (store.isPreviewMode) store.isPreviewMode = false
    else if (narrow.value) { leftOpen.value = false; rightOpen.value = false }
    return
  }
  if (store.isPreviewMode || (e.target instanceof HTMLElement && e.target.closest('input, textarea, select, [contenteditable="true"], [role="textbox"]'))) return
  const mod = e.ctrlKey || e.metaKey
  const key = e.key.toLowerCase()
  if (mod && key === 'z' && !e.shiftKey) { e.preventDefault(); store.undo() }
  else if (mod && ((key === 'z' && e.shiftKey) || key === 'y')) { e.preventDefault(); store.redo() }
}
const flush = () => { if (store.saveState === 'saving') store.saveDocument() }
onMounted(() => { window.addEventListener('keydown', onKey); window.addEventListener('pagehide', flush); document.addEventListener('visibilitychange', flush) })
onBeforeUnmount(() => { flush(); stopResize?.(); window.removeEventListener('keydown', onKey); window.removeEventListener('pagehide', flush); document.removeEventListener('visibilitychange', flush) })
</script>

<template>
  <div class="editor-shell">
    <div v-if="!store.isPreviewMode" class="document-toolbar">
      <VBtn icon="mdi-view-list-outline" size="small" variant="text" aria-label="Toggle components and layers" :aria-expanded="leftOpen" @click="togglePanel('left')" />
      <span class="document-name">{{ store.rootNode.name }}</span>
      <span class="save-status" role="status" :class="{ 'text-error': store.saveState === 'error' }">
        {{ store.saveState === 'saved' ? 'Saved in this browser' : store.saveState === 'saving' ? 'Saving…' : 'Not saved — export a backup' }}
      </span>
      <div class="document-actions">
        <VBtn size="small" variant="text" prepend-icon="mdi-import" @click="importInput?.click()">Import</VBtn>
        <VBtn size="small" variant="text" prepend-icon="mdi-export" @click="exportPage">Export</VBtn>
        <VBtn icon="mdi-tune-variant" size="small" variant="text" aria-label="Toggle properties" :aria-expanded="rightOpen" @click="togglePanel('right')" />
      </div>
      <input ref="importInput" type="file" accept="application/json,.json" hidden aria-label="Import page" @change="importPage" />
    </div>
    <div class="builder-layout" :class="{ 'builder-layout--narrow': narrow }">
      <button v-if="narrow && !store.isPreviewMode && (leftOpen || rightOpen)" class="panel-backdrop" aria-label="Close panel" @click="leftOpen = false; rightOpen = false" />
      <aside v-if="leftOpen && !store.isPreviewMode" class="editor-panel editor-panel--left" :style="{ width: `${leftWidth}px` }" aria-label="Components and layers">
        <div class="panel-heading"><strong>Components & layers</strong><VBtn icon="mdi-close" variant="text" size="small" aria-label="Close components panel" @click="leftOpen = false" /></div>
        <SidebarTree />
      </aside>
      <div v-if="leftOpen && !narrow && !store.isPreviewMode" class="panel-resizer" role="separator" aria-label="Resize components panel" aria-orientation="vertical" :aria-valuenow="leftWidth" :aria-valuemin="260" :aria-valuemax="480" tabindex="0" @pointerdown="startResize($event, 'left')" @keydown.left.prevent="resize('left', -20)" @keydown.right.prevent="resize('left', 20)" />
      <main class="canvas-region"><MainCanvas @open-components="leftOpen = true; rightOpen = narrow ? false : rightOpen" /></main>
      <div v-if="rightOpen && !narrow && !store.isPreviewMode" class="panel-resizer" role="separator" aria-label="Resize properties panel" aria-orientation="vertical" :aria-valuenow="rightWidth" :aria-valuemin="260" :aria-valuemax="480" tabindex="0" @pointerdown="startResize($event, 'right')" @keydown.left.prevent="resize('right', 20)" @keydown.right.prevent="resize('right', -20)" />
      <aside v-if="rightOpen && !store.isPreviewMode" class="editor-panel editor-panel--right" :style="{ width: `${rightWidth}px` }" aria-label="Properties">
        <div class="panel-heading"><strong>Properties</strong><VBtn icon="mdi-close" variant="text" size="small" aria-label="Close properties panel" @click="rightOpen = false" /></div>
        <PropertyPanel />
      </aside>
    </div>
    <VSnackbar v-model="snackbar" :timeout="5000">{{ store.notice }}<template #actions><VBtn variant="text" @click="snackbar = false">Dismiss</VBtn></template></VSnackbar>
  </div>
</template>

<style scoped>
.editor-shell { display: flex; flex-direction: column; flex: 1; min-height: 0; }
.document-toolbar { display: flex; align-items: center; gap: 10px; padding: 8px 12px; border-bottom: 1px solid rgba(var(--v-border-color), .15); flex-wrap: wrap; }
.document-name { font-size: 14px; font-weight: 600; max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.save-status { font-size: 12px; color: rgb(var(--v-theme-on-surface)); opacity: .75; }
.document-actions { display: flex; align-items: center; margin-left: auto; }
.builder-layout { display: flex; position: relative; flex: 1; min-height: 0; overflow: hidden; }
.editor-panel { flex-shrink: 0; display: flex; flex-direction: column; min-height: 0; background: rgb(var(--v-theme-surface)); }
.panel-heading { display: flex; align-items: center; justify-content: space-between; padding: 4px 12px; font-size: 13px; flex-shrink: 0; }
.canvas-region { flex: 1; min-width: 0; min-height: 0; }
.panel-resizer { width: 6px; flex-shrink: 0; cursor: col-resize; background: rgba(var(--v-theme-on-surface), .06); touch-action: none; }
.panel-resizer:hover { background: rgba(var(--v-theme-primary), .35); }
.builder-layout--narrow .editor-panel { position: absolute; z-index: 5; inset-block: 0; max-width: calc(100% - 32px); box-shadow: 0 8px 24px #0003; }
.builder-layout--narrow .editor-panel--right { right: 0; }
.panel-backdrop { position: absolute; inset: 0; z-index: 4; background: #0005; }
@media (max-width: 600px) { .save-status { order: 3; width: 100%; } .document-toolbar { gap: 4px; } .document-name { max-width: 120px; } }
</style>
