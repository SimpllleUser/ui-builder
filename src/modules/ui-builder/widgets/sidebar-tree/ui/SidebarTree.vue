<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useUiTreeStore } from '../../../entities/ui-node/model/store'
import { WRAP_CONTAINER_TYPES as WRAP_ALLOWED_TYPES, getComponentDef } from '../../../entities/ui-node/model/componentDefinitions'
import SidebarTreeNode from './SidebarTreeNode.vue'
import ComponentsPalette from '../../components-palette/ui/ComponentsPalette.vue'

const store = useUiTreeStore()
const { rootNode, selectedNodeIds, selectedNodeId, prefabs } = storeToRefs(store)

const activeTab = ref<'tree' | 'prefabs'>('tree')

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
  const targetId = selectedNodeId.value ?? 'root-canvas'
  store.insertPrefab(prefabId, targetId)
}
</script>

<template>
  <VNavigationDrawer permanent width="300" border="e" class="flex-grow-1 sidebar-drawer">
    <div class="d-flex flex-column h-100">

      <ComponentsPalette />

      <VTabs v-model="activeTab" density="compact" grow class="flex-shrink-0">
        <VTab value="tree">UI Tree</VTab>
        <VTab value="prefabs">My Components</VTab>
      </VTabs>

      <VWindow v-model="activeTab" class="flex-grow-1 overflow-y-auto">

        <VWindowItem value="tree" class="pa-2">
          <div class="text-h6 px-2 mb-4 mt-2">UI Tree</div>
          <VList density="compact" nav class="pa-0">
            <SidebarTreeNode :node="rootNode" :depth="0" />
          </VList>
        </VWindowItem>

        <VWindowItem value="prefabs" class="pa-2">
          <div class="text-h6 px-2 mb-4 mt-2">My Components</div>

          <div v-if="prefabs.length === 0" class="text-center pa-8">
            <VIcon icon="mdi-puzzle-outline" size="36" class="mb-3 opacity-20" />
            <div class="text-body-2 text-medium-emphasis">No saved presets yet</div>
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
                  variant="text"
                  size="x-small"
                  @click="onInsertPrefab(prefab.prefabId)"
                />
                <VBtn
                  icon="mdi-trash-can-outline"
                  variant="text"
                  size="x-small"
                  color="error"
                  @click="store.deletePrefab(prefab.prefabId)"
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
            <div class="wrap-chips">
              <button
                class="wrap-chip wrap-chip--unwrap"
                @click="store.unwrapNode(selectedNodeIds[0])"
              >
                <VIcon icon="mdi-arrow-expand-all" size="12" class="mr-1" />
                Lift children up
              </button>
            </div>
          </template>
        </div>
      </VSlideYReverseTransition>

    </div>
  </VNavigationDrawer>
</template>

<style scoped>
.sidebar-drawer {
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

.prefab-row:hover .prefab-actions {
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
  opacity: 0;
  transition: opacity 0.1s;
}

.wrap-toolbar {
  padding: 8px 10px;
  background: rgb(var(--v-theme-surface-variant));
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex-shrink: 0;
}

.wrap-label {
  font-size: 11px;
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
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
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
</style>
