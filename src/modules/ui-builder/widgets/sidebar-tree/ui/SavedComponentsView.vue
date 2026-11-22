<script setup lang="ts">
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useUiTreeStore } from '../../../entities/ui-node/model/store'
import { getComponentDef } from '../../../entities/ui-node/model/componentDefinitions'

/** Elements saved to reuse: insert one into the page or remove it from the library. */
const store = useUiTreeStore()
const { prefabs } = storeToRefs(store)

const deleting = ref<string | null>(null)
const confirmDelete = () => {
  if (deleting.value) store.deletePrefab(deleting.value)
  deleting.value = null
}
</script>

<template>
  <div class="sidebar-view__scroll pa-2">
    <div v-if="prefabs.length === 0" class="text-center pa-8">
      <VIcon icon="mdi-puzzle-outline" size="36" class="mb-3 opacity-20" />
      <div class="text-body-2 text-medium-emphasis">No saved components yet</div>
      <div class="text-caption text-medium-emphasis mt-1 opacity-70">
        Select a node and click <VIcon icon="mdi-content-save-outline" size="12" /> in the property panel
      </div>
    </div>
    <div v-else class="prefabs-list">
      <div v-for="prefab in prefabs" :key="prefab.prefabId" class="prefab-row">
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
            @click="store.insertPrefab(prefab.prefabId)"
          />
          <VBtn
            icon="mdi-trash-can-outline"
            :aria-label="`Delete saved component ${prefab.name}`"
            variant="text"
            size="x-small"
            color="error"
            @click="deleting = prefab.prefabId"
          />
        </div>
      </div>
    </div>

    <VDialog :model-value="!!deleting" max-width="400" @update:model-value="deleting = null">
      <VCard
        title="Delete saved component?"
        text="Existing copies on your page will remain. This removes the component from your library."
      >
        <VCardActions
          ><VSpacer /><VBtn @click="deleting = null">Cancel</VBtn
          ><VBtn color="error" @click="confirmDelete">Delete</VBtn></VCardActions
        >
      </VCard>
    </VDialog>
  </div>
</template>

<style scoped>
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

.prefab-row:hover .prefab-actions,
.prefab-row:focus-within .prefab-actions {
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
</style>
