<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { storeToRefs } from 'pinia'
import { useTheme } from 'vuetify'
import { useUiTreeStore, TEMPLATES, NodeRenderer, canvasDragTargetId } from '../../../entities/ui-node'
import HoverBadge from './HoverBadge.vue'
import SelectionToolbar from './SelectionToolbar.vue'
const emit = defineEmits<{ 'open-components': [] }>()
const store = useUiTreeStore()
const { rootNode, canUndo, canRedo, isPreviewMode, selectedNodeIds } = storeToRefs(store)
const theme = useTheme()
const viewport = ref(1280)
const zoom = ref(100)
const previewTarget = ref<HTMLElement | null>(null)
const canvas = ref<HTMLElement>()
const empty = computed(
  () => !rootNode.value.children.length && !Object.values(rootNode.value.slots).some(nodes => nodes.length),
)
const variables = computed(() =>
  Object.entries(store.runtimeState).map(([name, value]) => ({
    name,
    value: (typeof value === 'string' ? JSON.stringify(value) : (JSON.stringify(value) ?? 'undefined')).slice(0, 80),
  })),
)
const pageItems = computed(() => store.pages.map(page => ({ title: page.name, subtitle: page.path, value: page.id })))
const devices = [
  { title: 'Desktop · 1280', value: 1280 },
  { title: 'Tablet · 768', value: 768 },
  { title: 'Mobile · 390', value: 390 },
]
const loadPreview = (event: Event) => {
  const doc = (event.target as HTMLIFrameElement).contentDocument
  if (!doc) return
  document
    .querySelectorAll('style, link[rel="stylesheet"]')
    .forEach(style => doc.head.appendChild(style.cloneNode(true)))
  const reset = doc.createElement('style')
  reset.textContent =
    'html, body { margin: 0; overflow: auto !important; } .preview-app { min-height: 100vh; background: rgb(var(--v-theme-background)); color: rgb(var(--v-theme-on-background)); }'
  doc.head.appendChild(reset)
  doc.addEventListener('keydown', event => {
    if (event.key === 'Escape') isPreviewMode.value = false
  })
  previewTarget.value = doc.getElementById('preview-root')
}
watch(isPreviewMode, () => {
  previewTarget.value = null
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
      <template v-if="isPreviewMode">
        <!-- While a saved component is open, Preview shows only it; this switches to another one. -->
        <VMenu v-if="store.editingPrefab" location="bottom start">
          <template #activator="{ props: menu }">
            <VBtn
              v-bind="menu"
              size="small"
              variant="tonal"
              prepend-icon="mdi-puzzle-outline"
              append-icon="mdi-menu-down"
              :aria-label="`Preview shows the component ${store.editingPrefab.name}. Choose another component`"
            >
              {{ store.editingPrefab.name }}
            </VBtn>
          </template>
          <VList density="compact" aria-label="Saved components">
            <VListItem
              v-for="prefab in store.prefabs"
              :key="prefab.prefabId"
              :title="prefab.name"
              :active="prefab.prefabId === store.editingPrefab.prefabId"
              @click="store.editPrefab(prefab.prefabId)"
            />
          </VList>
        </VMenu>
        <!-- Where the preview is now, like a browser's address bar; click to jump to another page. -->
        <VMenu v-else location="bottom start">
          <template #activator="{ props: menu }">
            <VBtn
              v-bind="menu"
              class="route-pill"
              size="small"
              variant="tonal"
              prepend-icon="mdi-web"
              append-icon="mdi-menu-down"
              :aria-label="`Preview is on ${store.previewPage.name}, route ${store.previewPage.path}. Choose another page`"
            >
              <span class="route-pill__path">{{ store.previewPage.path }}</span>
            </VBtn>
          </template>
          <VList density="compact" aria-label="Pages">
            <VListItem
              v-for="item in pageItems"
              :key="item.value"
              :title="item.title"
              :subtitle="item.subtitle"
              :active="item.value === store.previewPage.id"
              @click="store.previewPageId = item.value"
            />
          </VList>
        </VMenu>
        <!-- What the variables are right now, to see why something does or does not show. -->
        <VMenu v-if="variables.length" location="bottom start" :close-on-content-click="false">
          <template #activator="{ props: menu }">
            <VBtn v-bind="menu" size="small" variant="text" prepend-icon="mdi-variable">
              {{ variables.length }} {{ variables.length === 1 ? 'variable' : 'variables' }}
            </VBtn>
          </template>
          <VCard min-width="240" class="pa-3">
            <div class="text-overline mb-1">Current values</div>
            <dl class="variable-list">
              <template v-for="variable in variables" :key="variable.name">
                <dt>{{ variable.name }}</dt>
                <dd>{{ variable.value }}</dd>
              </template>
            </dl>
          </VCard>
        </VMenu>
        <VBtn
          size="small"
          variant="text"
          prepend-icon="mdi-restore"
          title="Set every variable back to its starting value and return to the first page"
          @click="store.resetPreview()"
        >
          Reset
        </VBtn>
        <VSelect
          v-if="!store.editingPrefab"
          v-model="viewport"
          :items="devices"
          label="Viewport"
          variant="outlined"
          density="compact"
          hide-details
          class="viewport-select"
        />
        <VSelect
          v-if="!store.editingPrefab"
          v-model="zoom"
          :items="[50, 75, 100, 125].map(n => ({ title: `${n}%`, value: n }))"
          label="Zoom"
          variant="outlined"
          density="compact"
          hide-details
          class="zoom-select"
        />
      </template>
      <div class="canvas-toolbar__actions">
        <template v-if="!isPreviewMode">
          <VBtn
            icon="mdi-undo"
            size="small"
            variant="text"
            :disabled="!canUndo"
            title="Undo (Ctrl / ⌘ Z)"
            aria-label="Undo"
            @click="store.undo()"
          />
          <VBtn
            icon="mdi-redo"
            size="small"
            variant="text"
            :disabled="!canRedo"
            title="Redo (Ctrl / ⌘ Shift Z)"
            aria-label="Redo"
            @click="store.redo()"
          />
        </template>
        <VBtn
          :prepend-icon="isPreviewMode ? 'mdi-pencil-outline' : 'mdi-eye-outline'"
          size="small"
          :variant="isPreviewMode ? 'flat' : 'tonal'"
          color="primary"
          data-tour="preview"
          @click="isPreviewMode = !isPreviewMode"
        >
          {{ isPreviewMode ? 'Back to editor' : 'Preview' }}
        </VBtn>
      </div>
    </div>
    <!-- A component is previewed on the canvas itself: only the mode changes, the panels and the canvas stay. -->
    <div v-if="isPreviewMode && !store.editingPrefab" class="preview-workspace">
      <div class="preview-size" :style="{ width: `${(viewport * zoom) / 100}px`, height: `${(800 * zoom) / 100}px` }">
        <iframe
          title="Page preview"
          :width="viewport"
          height="800"
          srcdoc="<!doctype html><html><head><meta name='viewport' content='width=device-width, initial-scale=1'></head><body><div id='preview-root'></div></body></html>"
          :style="{ transform: `scale(${zoom / 100})` }"
          @load="loadPreview"
        />
      </div>
      <Teleport v-if="previewTarget" :to="previewTarget">
        <div class="v-application preview-app" :class="`v-theme--${theme.global.name.value}`">
          <NodeRenderer :key="store.previewPage.id" :node="store.previewRoot" :in-page="!store.project.layout" />
        </div>
      </Teleport>
    </div>
    <div
      v-else
      ref="canvas"
      class="main-canvas-wrapper"
      data-tour="canvas"
      @click="store.selectNode(null)"
      @dragleave="leaveCanvas"
    >
      <div v-if="empty && !isPreviewMode" class="canvas-empty" @click.stop>
        <VIcon icon="mdi-view-dashboard-outline" size="40" color="primary" />
        <h1>Build your first page</h1>
        <p>Add a component, drag one onto the canvas, or start with a template.</p>
        <VBtn color="primary" prepend-icon="mdi-plus" class="my-4" @click="emit('open-components')"
          >Browse components</VBtn
        >
        <div class="template-grid" data-tour="start">
          <button v-for="template in TEMPLATES" :key="template.kind" @click="store.addTemplate(template.kind)">
            <VIcon :icon="template.icon" /><strong>{{ template.label }}</strong
            ><span>{{ template.description }}</span>
          </button>
        </div>
      </div>
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
        add a parameter. Copies already on pages are not changed.
      </VAlert>
      <NodeRenderer
        :key="store.editingPrefab?.prefabId"
        :node="isPreviewMode ? store.previewRoot : rootNode"
        :in-page="!!store.editingPrefab"
      />
      <template v-if="!isPreviewMode">
        <HoverBadge :container="canvas" />
        <SelectionToolbar :container="canvas" />
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
.viewport-select {
  flex: 0 1 190px !important;
  min-width: 150px;
}
.zoom-select {
  flex: 0 1 120px !important;
  min-width: 110px;
}
.main-canvas-wrapper {
  position: relative;
}
.route-pill {
  text-transform: none;
  letter-spacing: 0;
}
.route-pill__path {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 13px;
}
.variable-list {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 4px 16px;
  margin: 0;
  font-size: 13px;
}
.variable-list dt {
  font-weight: 600;
}
.variable-list dd {
  margin: 0;
  overflow-wrap: anywhere;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  opacity: 0.85;
}
.main-canvas-wrapper,
.preview-workspace {
  flex: 1;
  overflow: auto;
  padding: 20px;
  background: rgb(var(--v-theme-surface-light));
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
.canvas-empty {
  max-width: 640px;
  margin: 24px auto;
  text-align: center;
}
.canvas-empty h1 {
  font-size: 24px;
  margin: 12px 0 8px;
}
.canvas-empty p,
.drop-hint {
  font-size: 14px;
  color: rgb(var(--v-theme-on-surface));
  opacity: 0.75;
}
.drop-hint {
  text-align: center;
  margin-top: 12px;
}
.template-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(145px, 1fr));
  gap: 12px;
  margin-top: 12px;
}
.template-grid button {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 20px 12px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.2);
  border-radius: 12px;
  background: rgb(var(--v-theme-surface));
}
.template-grid button:hover {
  border-color: rgb(var(--v-theme-primary));
}
.template-grid span {
  font-size: 12px;
}
.ui-builder-element {
  outline: 1px dashed rgba(var(--v-theme-on-surface), 0.2);
  min-height: 24px;
  position: relative;
}
.ui-builder-element.is-selected {
  outline: 2px solid rgb(var(--v-theme-primary)) !important;
}
.ui-builder-element.is-drag-over {
  outline: 2px dashed rgb(var(--v-theme-primary)) !important;
  background: rgba(var(--v-theme-primary), 0.08) !important;
}
.v-card.ui-builder-element {
  min-height: 80px;
}
.v-row.ui-builder-element {
  min-height: 80px;
}
.v-col.ui-builder-element {
  min-height: 60px;
}
.ui-builder-element[data-node-id='root-canvas'] {
  min-height: 1600px;
  background: rgb(var(--v-theme-background)) !important;
}
.main-canvas-wrapper .v-application__wrap {
  min-height: 520px;
}
.main-canvas-wrapper .v-layout {
  position: relative;
}
.overlay-placeholder {
  padding: 8px;
  border-radius: 8px;
  background: rgba(var(--v-theme-primary), 0.05);
}
.overlay-placeholder__label {
  font-size: 12px;
  opacity: 0.75;
  margin-bottom: 6px;
}
.outlet-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 160px;
  font-size: 13px;
  opacity: 0.75;
  background: rgba(var(--v-theme-primary), 0.05);
}
@media (max-width: 600px) {
  .main-canvas-wrapper,
  .preview-workspace {
    padding: 12px;
  }
}
</style>
