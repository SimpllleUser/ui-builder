<script setup lang="ts">
import { SaveState, useUiTreeStore, ROOT_NODE_ID } from '../modules/ui-builder/entities/ui-node'
import { PanelSide } from './shell/panelSide'
import { ref, watch } from 'vue'
import { useMediaQuery } from '@vueuse/core'
import { ComponentsPalette } from '../modules/ui-builder/widgets/components-palette'
import { MainCanvas } from '../modules/ui-builder/widgets/main-canvas'
import { SidebarTree } from '../modules/ui-builder/widgets/sidebar-tree'
import { OnboardingTour, useFirstRunTour } from '../modules/ui-builder/widgets/onboarding'
import { CommandPalette, type CommandHost } from '../modules/ui-builder/widgets/command-palette'
import { PageTabs, PagesPanel } from '../modules/ui-builder/widgets/pages-panel'
import { PropertyPanel, useDesignTabPreference } from '../modules/ui-builder/widgets/property-panel'
import { useEditorPanels } from './shell/useEditorPanels'
import { useEditorShortcuts } from './shell/useEditorShortcuts'
import { platformModifierKey, useFocusMode } from './shell/useFocusMode'
import { useProjectFiles } from './shell/useProjectFiles'

const store = useUiTreeStore()
const narrow = useMediaQuery('(max-width: 1100px)')
const modifierKey = platformModifierKey()
const designTab = useDesignTabPreference()

const panels = useEditorPanels(store, narrow)
const { leftOpen, rightOpen, leftWidth, rightWidth, rightSlim, rightFull, rightPanelWidth, limits } = panels
const {
  animating: panelAnimating,
  closeAll: closePanels,
  openComponents,
  toggle: togglePanel,
  resize,
  startResize,
} = panels
const { focusMode, showChrome, toggleFocus } = useFocusMode(store, modifierKey)
const { open: tourOpen, finish: finishTour, start: startTour } = useFirstRunTour(store)
const { exportProject, importFromInput } = useProjectFiles(store)

const importInput = ref<HTMLInputElement>()
const pageTabs = ref<InstanceType<typeof PageTabs>>()
const paletteOpen = ref(false)

// What the search box and the quick tour can ask of the editor shell.
const commandHost: CommandHost = {
  addPage: () => pageTabs.value?.openAdd(),
  renameCurrentPage: () => pageTabs.value?.openEdit(),
  importProject: () => importInput.value?.click(),
  exportProject,
  startTour,
  toggleFocus,
  toggleLayersPanel: () => togglePanel(PanelSide.Left),
  toggleProperties: () => togglePanel(PanelSide.Right),
  modifierKey,
}

// Messages appear in a snackbar; show every one, also one that repeats the previous text.
const snackbar = ref(false)
watch(
  () => store.noticeSerial,
  () => {
    if (store.notice) snackbar.value = true
  },
  { immediate: true },
)
const undoFromMessage = () => {
  snackbar.value = false
  store.undo()
}

useEditorShortcuts({
  store,
  paletteOpen,
  focusMode,
  narrow,
  toggleFocus,
  closePanels,
  flushSave: () => {
    if (store.saveState === SaveState.Saving) store.saveDocument()
  },
})
</script>

<template>
  <div class="editor-shell">
    <div v-if="showChrome" class="document-toolbar">
      <VBtn
        icon="mdi-view-list-outline"
        size="small"
        variant="text"
        aria-label="Toggle components and layers"
        :aria-expanded="leftOpen"
        @click="togglePanel(PanelSide.Left)"
      />
      <PagesPanel />
      <VBtn
        size="small"
        variant="text"
        prepend-icon="mdi-magnify"
        class="palette-button"
        :aria-label="`Search commands (${modifierKey} K)`"
        :title="`Search commands, components, pages and settings (${modifierKey} K)`"
        @click="paletteOpen = true"
      >
        <span class="palette-button__label">Search</span>
        <kbd class="palette-button__kbd">{{ modifierKey }} K</kbd>
      </VBtn>
      <!-- Saving is the normal state, so it stays quiet: a check mark, with words only for progress and problems. -->
      <span class="save-status" role="status" :class="{ 'text-error': store.saveState === SaveState.Error }">
        <template v-if="store.saveState === SaveState.Saved">
          <VIcon icon="mdi-check-circle-outline" size="16" aria-hidden="true" title="Saved in this browser" />
          <span class="sr-only">Saved in this browser</span>
        </template>
        <template v-else-if="store.saveState === SaveState.Saving">Saving…</template>
        <template v-else>Not saved — use ⋯ → Export to keep a backup</template>
      </span>
      <div class="document-actions">
        <VMenu location="bottom end">
          <template #activator="{ props: menu }">
            <VBtn
              v-bind="menu"
              icon="mdi-dots-horizontal"
              size="small"
              variant="text"
              aria-label="More actions"
              title="Import, export and more"
            />
          </template>
          <VList density="compact">
            <VListItem prepend-icon="mdi-import" title="Import project…" @click="importInput?.click()" />
            <VListItem prepend-icon="mdi-export" title="Export project" @click="exportProject" />
            <VDivider />
            <VListItem
              prepend-icon="mdi-arrow-expand-all"
              title="Focus mode"
              :subtitle="`Only the canvas · ${modifierKey} \\`"
              @click="toggleFocus"
            />
            <VListItem
              prepend-icon="mdi-palette-outline"
              title="Design tab in Properties"
              subtitle="Figma-style size, layout, radius and fill"
              :append-icon="designTab ? 'mdi-check' : undefined"
              @click="designTab = !designTab"
            />
            <VListItem prepend-icon="mdi-compass-outline" title="Quick tour" @click="startTour" />
          </VList>
        </VMenu>
        <VBtn
          icon="mdi-tune-variant"
          size="small"
          variant="text"
          aria-label="Toggle properties"
          :aria-expanded="rightOpen"
          @click="togglePanel(PanelSide.Right)"
        />
      </div>
      <input
        ref="importInput"
        type="file"
        accept="application/json,.json"
        hidden
        aria-label="Import page"
        @change="importFromInput"
      />
    </div>
    <PageTabs v-if="showChrome" ref="pageTabs" />
    <button v-if="focusMode && !store.isPreviewMode" class="focus-exit" @click="focusMode = false">
      <VIcon icon="mdi-arrow-collapse-all" size="16" aria-hidden="true" />
      Exit focus mode <kbd>Esc</kbd>
    </button>
    <CommandPalette v-model="paletteOpen" :host="commandHost" />
    <OnboardingTour v-if="tourOpen" v-model="tourOpen" :suspended="store.isPreviewMode" @finish="finishTour" />
    <div class="builder-layout" :class="{ 'builder-layout--narrow': narrow }">
      <button
        v-if="narrow && showChrome && (leftOpen || rightOpen)"
        class="panel-backdrop"
        aria-label="Close panel"
        @click="closePanels"
      />
      <aside
        v-if="leftOpen && showChrome"
        class="editor-panel editor-panel--left"
        :style="{ width: `${leftWidth}px` }"
        aria-label="Components and layers"
      >
        <SidebarTree @close="leftOpen = false">
          <template #components><ComponentsPalette /></template>
        </SidebarTree>
      </aside>
      <div
        v-if="leftOpen && !narrow && showChrome"
        class="panel-resizer"
        role="separator"
        aria-label="Resize components panel"
        aria-orientation="vertical"
        :aria-valuenow="leftWidth"
        :aria-valuemin="limits.min"
        :aria-valuemax="limits.max"
        tabindex="0"
        @pointerdown="startResize($event, PanelSide.Left)"
        @keydown.left.prevent="resize(PanelSide.Left, -20)"
        @keydown.right.prevent="resize(PanelSide.Left, 20)"
      />
      <main class="canvas-region">
        <MainCanvas @open-components="openComponents" />
      </main>
      <div
        v-if="rightFull && !narrow && showChrome"
        class="panel-resizer"
        role="separator"
        aria-label="Resize properties panel"
        aria-orientation="vertical"
        :aria-valuenow="rightWidth"
        :aria-valuemin="limits.min"
        :aria-valuemax="limits.max"
        tabindex="0"
        @pointerdown="startResize($event, PanelSide.Right)"
        @keydown.left.prevent="resize(PanelSide.Right, 20)"
        @keydown.right.prevent="resize(PanelSide.Right, -20)"
      />
      <aside
        v-if="rightOpen && showChrome"
        class="editor-panel editor-panel--right"
        :class="{ 'editor-panel--slim': rightSlim, 'editor-panel--animated': panelAnimating }"
        :style="{ width: rightPanelWidth }"
        aria-label="Properties"
      >
        <button
          v-if="rightSlim"
          class="slim-properties"
          title="Nothing is selected. Select an element, or click here to edit the page itself."
          aria-label="Properties: nothing selected. Edit page settings"
          @click="store.selectNode(ROOT_NODE_ID)"
        >
          <VIcon icon="mdi-tune-variant" size="20" aria-hidden="true" />
          <span>Properties</span>
        </button>
        <template v-else>
          <div class="panel-heading">
            <strong>Properties</strong
            ><VBtn
              icon="mdi-close"
              variant="text"
              size="small"
              aria-label="Close properties panel"
              @click="rightOpen = false"
            />
          </div>
          <PropertyPanel />
        </template>
      </aside>
    </div>
    <VSnackbar v-model="snackbar" :timeout="store.noticeUndo ? 10000 : 5000">
      {{ store.notice }}
      <template #actions>
        <VBtn
          v-if="store.noticeUndo"
          variant="text"
          color="primary-lighten-2"
          prepend-icon="mdi-undo"
          @click="undoFromMessage"
        >
          Undo
        </VBtn>
        <VBtn variant="text" @click="snackbar = false">Dismiss</VBtn>
      </template>
    </VSnackbar>
  </div>
</template>

<style scoped>
.editor-shell {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}
.focus-exit {
  position: fixed;
  z-index: 20;
  bottom: 16px;
  left: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 16px;
  background: rgb(var(--v-theme-surface));
  box-shadow:
    0 2px 10px rgba(0, 0, 0, 0.2),
    0 0 0 1px rgba(var(--v-border-color), 0.2);
  font-size: 12px;
}
.focus-exit kbd {
  padding: 0 5px;
  border: 1px solid rgba(var(--v-border-color), 0.3);
  border-radius: 4px;
  font-family: inherit;
  font-size: 11px;
  opacity: 0.7;
}
.document-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.15);
  flex-wrap: wrap;
}
.palette-button__kbd {
  margin-left: 8px;
  padding: 0 5px;
  border: 1px solid rgba(var(--v-border-color), 0.3);
  border-radius: 4px;
  font-family: inherit;
  font-size: 11px;
  opacity: 0.7;
}
@media (max-width: 700px) {
  .palette-button__label,
  .palette-button__kbd {
    display: none;
  }
}
.save-status {
  display: inline-flex;
  align-items: center;
  font-size: 12px;
  color: rgb(var(--v-theme-on-surface));
  opacity: 0.75;
}
.document-actions {
  display: flex;
  align-items: center;
  margin-left: auto;
}
.builder-layout {
  display: flex;
  position: relative;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
.editor-panel {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: rgb(var(--v-theme-surface));
}
.panel-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 12px;
  font-size: 13px;
  flex-shrink: 0;
}
.canvas-region {
  flex: 1;
  min-width: 0;
  min-height: 0;
}
.editor-panel--animated {
  transition: width 0.18s ease;
}
.editor-panel--slim {
  border-left: 1px solid rgba(var(--v-border-color), 0.15);
}
.slim-properties {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding-top: 12px;
  color: rgba(var(--v-theme-on-surface), 0.7);
  font-size: 12px;
}
.slim-properties span {
  writing-mode: vertical-rl;
}
.slim-properties:hover {
  background: rgba(var(--v-theme-primary), 0.06);
  color: rgb(var(--v-theme-primary));
}
.panel-resizer {
  width: 6px;
  flex-shrink: 0;
  cursor: col-resize;
  background: rgba(var(--v-theme-on-surface), 0.06);
  touch-action: none;
}
.panel-resizer:hover {
  background: rgba(var(--v-theme-primary), 0.35);
}
.builder-layout--narrow .editor-panel {
  position: absolute;
  z-index: 5;
  inset-block: 0;
  max-width: calc(100% - 32px);
  box-shadow: 0 8px 24px #0003;
}
.builder-layout--narrow .editor-panel--right {
  right: 0;
}
.panel-backdrop {
  position: absolute;
  inset: 0;
  z-index: 4;
  background: #0005;
}
@media (max-width: 600px) {
  .save-status {
    order: 3;
    width: 100%;
  }
  .document-toolbar {
    gap: 4px;
  }
}
</style>
