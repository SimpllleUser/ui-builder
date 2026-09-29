<script setup lang="ts">
import { computed, ref, provide, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useUiTreeStore } from '../../../entities/ui-node/model/store'
import { WRAP_CONTAINER_TYPES as WRAP_ALLOWED_TYPES, getComponentDef } from '../../../entities/ui-node/model/componentDefinitions'
import { ROOT_NODE_ID } from '../../../entities/ui-node/model/constants'
import SidebarTreeNode from './SidebarTreeNode.vue'
import ComponentsPalette from '../../components-palette/ui/ComponentsPalette.vue'

const store = useUiTreeStore()
const { rootNode, selectedNodeIds, prefabs, historyVersions, historyPending, checkpoints } = storeToRefs(store)

type SidebarView = 'components' | 'layers' | 'prefabs' | 'history'
const activityViews: Array<{ id: SidebarView; icon: string; label: string }> = [
  { id: 'components', icon: 'mdi-shape-outline', label: 'Components' },
  { id: 'layers', icon: 'mdi-file-tree-outline', label: 'Layers' },
  { id: 'prefabs', icon: 'mdi-puzzle-outline', label: 'My components' },
  { id: 'history', icon: 'mdi-history', label: 'History' },
]
const activeView = ref<SidebarView>('layers')
const deletingPrefab = ref<string | null>(null)
const checkpointDialog = ref(false)
const checkpointName = ref('')
const checkpointDateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'short' })
const activeTreeId = ref(rootNode.value.id)

provide('ui-builder-active-tree-id', activeTreeId)
provide('ui-builder-set-active-tree-id', (id: string) => { activeTreeId.value = id })
watch(selectedNodeIds, ids => {
  if (ids[0]) activeTreeId.value = ids[0]
}, { immediate: true })

const canWrap = computed(() =>
  selectedNodeIds.value.length >= 2 && store.areNodesSiblings(selectedNodeIds.value)
)

const canUnwrap = computed(() => {
  if (selectedNodeIds.value.length !== 1) return false
  const id = selectedNodeIds.value[0]
  if (id === ROOT_NODE_ID) return false
  const node = store.findNodeById(id)
  return !!node && (node.children?.length > 0) && !!getComponentDef(node.type)?.isWrapContainer
})

const onInsertPrefab = (prefabId: string) => {
  store.insertPrefab(prefabId)
}
const viewTitle = computed(() => activityViews.find(view => view.id === activeView.value)?.label ?? 'Layers')
const selectView = (view: SidebarView) => { activeView.value = view }
const openCheckpointDialog = () => {
  checkpointName.value = `Checkpoint ${checkpoints.value.length + 1}`
  checkpointDialog.value = true
}
const saveCheckpoint = () => {
  if (!store.createCheckpoint(checkpointName.value)) return
  checkpointDialog.value = false
}
const formatCheckpointDate = (createdAt: number) => checkpointDateFormatter.format(createdAt)
</script>

<template>
  <div class="sidebar-drawer">
    <div class="d-flex flex-column h-100">

      <div class="sidebar-layout">
        <nav class="activity-bar" aria-label="Builder views">
          <button v-for="view in activityViews" :key="view.id" class="activity-button" :class="{ 'activity-button--active': activeView === view.id }" :aria-pressed="activeView === view.id" :title="view.label" @click="selectView(view.id)">
            <VIcon :icon="view.icon" size="21" aria-hidden="true" />
            <span class="sr-only">{{ view.label }}</span>
          </button>
        </nav>

        <section class="sidebar-view" :aria-label="viewTitle">
          <div class="explorer-heading">
            <span>{{ viewTitle }}</span>
            <span class="explorer-heading__hint">UI BUILDER</span>
          </div>

          <ComponentsPalette v-if="activeView === 'components'" />

          <div v-else-if="activeView === 'layers'" class="sidebar-view__scroll">
            <p id="layers-help" class="text-caption px-2 my-2">Use ↑ ↓ to move, ← → to collapse or expand, Enter to select. Shift-click selects several elements.</p>
            <div role="tree" aria-label="Page layers" aria-describedby="layers-help" aria-multiselectable="true" class="pa-2">
              <SidebarTreeNode :node="rootNode" :depth="0" />
            </div>
          </div>

          <div v-else-if="activeView === 'prefabs'" class="sidebar-view__scroll pa-2">
            <div v-if="prefabs.length === 0" class="text-center pa-8">
              <VIcon icon="mdi-puzzle-outline" size="36" class="mb-3 opacity-20" />
              <div class="text-body-2 text-medium-emphasis">No saved components yet</div>
              <div class="text-caption text-medium-emphasis mt-1 opacity-70">Select a node and click <VIcon icon="mdi-content-save-outline" size="12" /> in the property panel</div>
            </div>
            <div v-else class="prefabs-list">
              <div v-for="prefab in prefabs" :key="prefab.prefabId" class="prefab-row">
                <VIcon :icon="getComponentDef(prefab.node.type)?.treeIcon ?? 'mdi-puzzle-outline'" size="15" class="prefab-icon" />
                <span class="prefab-name">{{ prefab.name }}</span>
                <div class="prefab-actions">
                  <VBtn icon="mdi-plus" :aria-label="`Insert ${prefab.name}`" variant="text" size="x-small" @click="onInsertPrefab(prefab.prefabId)" />
                  <VBtn icon="mdi-trash-can-outline" :aria-label="`Delete saved component ${prefab.name}`" variant="text" size="x-small" color="error" @click="deletingPrefab = prefab.prefabId" />
                </div>
              </div>
            </div>
          </div>

          <div v-else class="sidebar-view__scroll history-list" aria-label="Document history">
            <p class="history-help">Select a version to restore it. <span v-if="historyPending">Unsaved changes will be saved first.</span><span v-else>Older versions remain available until the history limit is reached.</span></p>
            <VBtn block size="small" color="primary" variant="tonal" prepend-icon="mdi-bookmark-plus-outline" class="history-save" @click="openCheckpointDialog">Save checkpoint</VBtn>

            <div v-if="checkpoints.length" class="history-section">
              <h3 class="history-section__title">Checkpoints</h3>
              <div v-for="checkpoint in checkpoints" :key="checkpoint.checkpointId" class="checkpoint-item">
                <button class="checkpoint-restore" @click="store.restoreCheckpoint(checkpoint.checkpointId)">
                  <VIcon icon="mdi-bookmark-outline" size="16" aria-hidden="true" />
                  <span><strong>{{ checkpoint.name }}</strong><small>{{ formatCheckpointDate(checkpoint.createdAt) }}</small></span>
                </button>
                <VBtn icon="mdi-delete-outline" variant="text" size="x-small" color="error" :aria-label="`Delete ${checkpoint.name}`" @click="store.deleteCheckpoint(checkpoint.checkpointId)" />
              </div>
            </div>

            <h3 class="history-section__title">Versions</h3>
            <button
              v-for="version in [...historyVersions].reverse()"
              :key="version.index"
              class="history-item"
              :class="{ 'history-item--current': version.isCurrent }"
              :aria-current="version.isCurrent ? 'true' : undefined"
              @click="store.restoreHistoryVersion(version.index)"
            >
              <VIcon :icon="version.isCurrent ? 'mdi-record-circle' : 'mdi-history'" size="16" aria-hidden="true" />
              <span>{{ version.label }}</span>
              <span v-if="version.isCurrent" class="history-current">Current</span>
            </button>
          </div>
        </section>
      </div>

      <VSlideYReverseTransition>
        <div v-if="(canWrap || canUnwrap) && activeView === 'layers'" class="wrap-toolbar">
          <template v-if="canWrap">
            <span class="wrap-label">Wrap {{ selectedNodeIds.length }} items:</span>
            <div class="wrap-chips">
              <button
                v-for="wt in WRAP_ALLOWED_TYPES"
                :key="wt.type"
                class="wrap-chip"
                @click="store.wrapNodes(selectedNodeIds, wt.type)"
              >
                <VIcon :icon="wt.icon" size="12" class="mr-1" />
                {{ wt.label }}
              </button>
            </div>
          </template>

          <template v-else-if="canUnwrap">
            <span class="wrap-label">Unwrap:</span>
            <p v-if="store.unwrapReason(selectedNodeIds[0])" class="text-caption">{{ store.unwrapReason(selectedNodeIds[0]) }}</p>
            <div class="wrap-chips">
              <button
                class="wrap-chip wrap-chip--unwrap"
                :disabled="!!store.unwrapReason(selectedNodeIds[0])"
                @click="store.unwrapNode(selectedNodeIds[0])"
              >
                <VIcon icon="mdi-arrow-expand-all" size="12" class="mr-1" />
                Lift children up
              </button>
            </div>
          </template>
        </div>
      </VSlideYReverseTransition>
      <VDialog :model-value="!!deletingPrefab" max-width="400" @update:model-value="deletingPrefab = null">
        <VCard title="Delete saved component?" text="Existing copies on your page will remain. This removes the component from your library.">
          <VCardActions><VSpacer /><VBtn @click="deletingPrefab = null">Cancel</VBtn><VBtn color="error" @click="store.deletePrefab(deletingPrefab!); deletingPrefab = null">Delete</VBtn></VCardActions>
        </VCard>
      </VDialog>
      <VDialog v-model="checkpointDialog" max-width="400">
        <VCard title="Save checkpoint">
          <VCardText>
            <VTextField v-model="checkpointName" label="Checkpoint name" autofocus hide-details @keyup.enter="saveCheckpoint" />
          </VCardText>
          <VCardActions>
            <VSpacer />
            <VBtn @click="checkpointDialog = false">Cancel</VBtn>
            <VBtn color="primary" :disabled="!checkpointName.trim()" @click="saveCheckpoint">Save</VBtn>
          </VCardActions>
        </VCard>
      </VDialog>

    </div>
  </div>
</template>

<style scoped>
.sidebar-drawer {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  :deep(.v-slide-group) {
    flex-grow: 0 !important;
  }
}

.sidebar-layout {
  display: flex;
  flex: 1;
  min-height: 0;
}

.activity-bar {
  display: flex;
  flex: 0 0 44px;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 4px;
  border-right: 1px solid rgba(var(--v-border-color), .15);
  background: rgb(var(--v-theme-surface-light));
}

.activity-button {
  position: relative;
  display: grid;
  width: 36px;
  height: 40px;
  place-items: center;
  border-radius: 5px;
  color: rgb(var(--v-theme-on-surface));
  opacity: .65;
}

.activity-button:hover,
.activity-button:focus-visible,
.activity-button--active {
  color: rgb(var(--v-theme-primary));
  opacity: 1;
  background: rgba(var(--v-theme-primary), .1);
}

.activity-button--active::before {
  position: absolute;
  left: -4px;
  width: 2px;
  height: 24px;
  border-radius: 2px;
  background: rgb(var(--v-theme-primary));
  content: '';
}

.sidebar-view {
  display: flex;
  flex: 1;
  min-width: 0;
  min-height: 0;
  flex-direction: column;
  container-type: inline-size;
}

.sidebar-view__scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.history-list {
  padding: 8px;
}

.history-help {
  margin: 4px 4px 10px;
  color: rgb(var(--v-theme-on-surface));
  font-size: 12px;
  opacity: .7;
}

.history-save {
  margin-bottom: 14px;
}

.history-section + .history-section {
  margin-top: 16px;
}

.history-section__title {
  margin: 0 4px 6px;
  color: rgb(var(--v-theme-on-surface));
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .06em;
  text-transform: uppercase;
  opacity: .65;
}

.checkpoint-item {
  display: flex;
  align-items: center;
  gap: 4px;
  min-height: 40px;
  border-radius: 6px;
}

.checkpoint-item:hover,
.checkpoint-item:focus-within {
  background: rgba(var(--v-theme-on-surface), .06);
}

.checkpoint-restore {
  display: flex;
  flex: 1;
  min-width: 0;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  color: rgb(var(--v-theme-on-surface));
  text-align: left;
}

.checkpoint-restore span {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.checkpoint-restore strong {
  overflow: hidden;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.checkpoint-restore small {
  font-size: 10px;
  opacity: .6;
}

.history-item {
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 36px;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 6px;
  color: rgb(var(--v-theme-on-surface));
  font-size: 13px;
  text-align: left;
}

.history-item:hover,
.history-item:focus-visible,
.history-item--current {
  background: rgba(var(--v-theme-primary), .1);
}

.history-current {
  margin-left: auto;
  color: rgb(var(--v-theme-primary));
  font-size: 11px;
}

.explorer-heading {
  display: flex;
  align-items: center;
  min-height: 36px;
  padding: 0 12px;
  color: rgb(var(--v-theme-on-surface));
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .08em;
  text-transform: uppercase;
}

.explorer-heading__hint {
  margin-left: auto;
  font-size: 9px;
  opacity: .5;
}

.sidebar-section-heading--layers {
  flex-shrink: 0;
  cursor: default;
}

.sidebar-tabs :deep(.v-tab) {
  min-width: 0;
  font-size: 11px;
  text-transform: none;
}

.prefabs-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.prefab-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 6px;
  border-radius: 6px;
  cursor: default;
  min-height: 30px;
}

.prefab-row:hover {
  background: rgba(var(--v-theme-on-surface), 0.06);
}

.prefab-row:hover .prefab-actions, .prefab-row:focus-within .prefab-actions {
  opacity: 1;
}

.prefab-icon {
  flex-shrink: 0;
  opacity: 0.55;
}

.prefab-name {
  flex: 1;
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.prefab-actions {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  opacity: 1;
  transition: opacity 0.1s;
}

.wrap-toolbar {
  padding: 8px 10px;
  background: rgb(var(--v-theme-surface-light));
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex-shrink: 0;
}

.wrap-label {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  opacity: 0.7;
  text-transform: uppercase;
}

.wrap-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.wrap-chip {
  display: inline-flex;
  align-items: center;
  padding: 6px 10px;
  border-radius: 12px;
  font-size: 12px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.2);
  background: rgba(var(--v-theme-surface), 0.9);
  color: rgb(var(--v-theme-on-surface));
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}

.wrap-chip:hover {
  background: rgba(var(--v-theme-primary), 0.12);
  border-color: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-primary));
}

.wrap-chip--unwrap:hover {
  background: rgba(var(--v-theme-warning), 0.12);
  border-color: rgb(var(--v-theme-warning));
  color: rgb(var(--v-theme-warning));
}
.wrap-chip:disabled { opacity: .6; cursor: not-allowed; }
</style>
