<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useUiTreeStore } from '../../../entities/ui-node/model/store'
import { WRAP_CONTAINER_TYPES as WRAP_ALLOWED_TYPES, getComponentDef } from '../../../entities/ui-node/model/componentDefinitions'
import SidebarTreeNode from './SidebarTreeNode.vue'
import ComponentsPalette from '../../components-palette/ui/ComponentsPalette.vue'

const store = useUiTreeStore()
const { rootNode, selectedNodeIds, prefabs } = storeToRefs(store)

const activeTab = ref<'tree' | 'prefabs'>('tree')
const deletingPrefab = ref<string | null>(null)

const canWrap = computed(() =>
  selectedNodeIds.value.length >= 2 && store.areNodesSiblings(selectedNodeIds.value)
)

const canUnwrap = computed(() => {
  if (selectedNodeIds.value.length !== 1) return false
  const id = selectedNodeIds.value[0]
  if (id === 'root-canvas') return false
  const node = store.findNodeById(id)
  return !!node && (node.children?.length > 0) && !!getComponentDef(node.type)?.isWrapContainer
})

const onInsertPrefab = (prefabId: string) => {
  store.insertPrefab(prefabId)
}
</script>

<template>
  <div class="sidebar-drawer">
    <div class="d-flex flex-column h-100">

      <ComponentsPalette />

      <VTabs v-model="activeTab" density="compact" grow class="flex-shrink-0">
        <VTab value="tree">Layers</VTab>
        <VTab value="prefabs">My components</VTab>
      </VTabs>

      <VWindow v-model="activeTab" class="flex-grow-1 overflow-y-auto">

        <VWindowItem value="tree" class="pa-2">
          <p class="text-caption px-2 my-2">Shift-click to select several elements. Use arrow keys to navigate.</p>
          <div role="tree" aria-label="Page layers" aria-multiselectable="true" class="pa-0">
            <SidebarTreeNode :node="rootNode" :depth="0" />
          </div>
        </VWindowItem>

        <VWindowItem value="prefabs" class="pa-2">
          <div class="text-h6 px-2 mb-4 mt-2">My components</div>

          <div v-if="prefabs.length === 0" class="text-center pa-8">
            <VIcon icon="mdi-puzzle-outline" size="36" class="mb-3 opacity-20" />
            <div class="text-body-2 text-medium-emphasis">No saved components yet</div>
            <div class="text-caption text-medium-emphasis mt-1 opacity-70">
              Select a node and click
              <VIcon icon="mdi-content-save-outline" size="12" />
              in the property panel
            </div>
          </div>

          <div v-else class="prefabs-list">
            <div
              v-for="prefab in prefabs"
              :key="prefab.prefabId"
              class="prefab-row"
            >
              <VIcon
                :icon="getComponentDef(prefab.node.type)?.treeIcon ?? 'mdi-puzzle-outline'"
                size="15"
                class="prefab-icon"
              />
              <span class="prefab-name">{{ prefab.name }}</span>
              <div class="prefab-actions">
                <VBtn
                  icon="mdi-plus"
                  :aria-label="`Insert ${prefab.name}`"
                  variant="text"
                  size="x-small"
                  @click="onInsertPrefab(prefab.prefabId)"
                />
                <VBtn
                  icon="mdi-trash-can-outline"
                  :aria-label="`Delete saved component ${prefab.name}`"
                  variant="text"
                  size="x-small"
                  color="error"
                  @click="deletingPrefab = prefab.prefabId"
                />
              </div>
            </div>
          </div>
        </VWindowItem>

      </VWindow>

      <VSlideYReverseTransition>
        <div v-if="(canWrap || canUnwrap) && activeTab === 'tree'" class="wrap-toolbar">
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
