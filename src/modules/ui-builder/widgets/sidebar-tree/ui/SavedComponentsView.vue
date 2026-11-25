<script setup lang="ts">
import EmptyState from '../../../../../shared/ui/EmptyState.vue'
import { onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useUiTreeStore, getComponentDef, type Prefab, type PrefabPropValues } from '../../../entities/ui-node'

/** Elements saved to reuse: insert one into the page or remove it from the library. */
const store = useUiTreeStore()
const { prefabs, editingPrefab, deletedPrefabs } = storeToRefs(store)

// The canvas shows the chosen component for editing: the first one until another is clicked.
onMounted(() => {
  if (!editingPrefab.value && prefabs.value.length) store.editPrefab(prefabs.value[0].prefabId)
})

const configuring = ref<Prefab | null>(null)
const propValues = ref<PrefabPropValues>({})

/** A component with parameters asks for their values first; one without is inserted right away. */
const insert = (prefab: Prefab) => {
  if (!prefab.props?.length) {
    store.insertPrefab(prefab.prefabId)
    return
  }
  propValues.value = Object.fromEntries(prefab.props.map(prop => [prop.name, prop.defaultValue]))
  configuring.value = prefab
}
const confirmInsert = () => {
  if (configuring.value) store.insertPrefab(configuring.value.prefabId, undefined, null, propValues.value)
  configuring.value = null
}
const updatePropValue = (propName: string, value: unknown) => {
  if (typeof value === 'string') propValues.value[propName] = value
}

const restore = (prefabId: string) => {
  if (store.restorePrefab(prefabId)) store.editPrefab(prefabId)
}

const deleting = ref<string | null>(null)
const confirmDelete = () => {
  if (deleting.value) store.deletePrefab(deleting.value)
  deleting.value = null
  if (!editingPrefab.value && prefabs.value.length) store.editPrefab(prefabs.value[0].prefabId)
}
</script>

<template>
  <div class="sidebar-view__scroll pa-2">
    <EmptyState
      v-if="prefabs.length === 0"
      icon="mdi-puzzle-outline"
      title="No saved components yet"
      description="Select an element, then press the save icon at the top of the inspector to keep it here and reuse it. Inserted components follow the original when you change it. Write props.name in double curly braces inside it to make a parameter."
    />
    <div v-else class="prefabs-list">
      <div
        v-for="prefab in prefabs"
        :key="prefab.prefabId"
        class="prefab-row"
        :class="{ 'prefab-row--active': prefab.prefabId === editingPrefab?.prefabId }"
        role="button"
        tabindex="0"
        :aria-label="`Edit ${prefab.name}`"
        @click="store.editPrefab(prefab.prefabId)"
        @keydown.enter="store.editPrefab(prefab.prefabId)"
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
            @click.stop="insert(prefab)"
          />
          <VBtn
            icon="mdi-delete-outline"
            :aria-label="`Delete saved component ${prefab.name}`"
            variant="text"
            size="x-small"
            color="error"
            @click.stop="deleting = prefab.prefabId"
          />
        </div>
      </div>
    </div>

    <section v-if="deletedPrefabs.length" class="deleted" aria-label="Recently deleted components">
      <h3 class="deleted__title">Recently deleted</h3>
      <div v-for="entry in deletedPrefabs" :key="entry.prefab.prefabId" class="prefab-row prefab-row--deleted">
        <VIcon icon="mdi-delete-clock-outline" size="15" class="prefab-icon" aria-hidden="true" />
        <span class="prefab-name">{{ entry.prefab.name }}</span>
        <VBtn
          icon="mdi-restore"
          :aria-label="`Restore ${entry.prefab.name}`"
          :title="`Restore ${entry.prefab.name}`"
          variant="text"
          size="x-small"
          @click="restore(entry.prefab.prefabId)"
        />
      </div>
    </section>

    <VDialog :model-value="!!configuring" max-width="420" @update:model-value="configuring = null">
      <VCard v-if="configuring" :title="`Insert ${configuring.name}`">
        <VCardText>
          <VTextField
            v-for="prop in configuring.props"
            :key="prop.name"
            :model-value="propValues[prop.name]"
            :label="prop.name"
            variant="outlined"
            density="compact"
            hide-details
            class="mb-2"
            @update:model-value="updatePropValue(prop.name, $event)"
            @keydown.enter="confirmInsert"
          />
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn @click="configuring = null">Cancel</VBtn>
          <VBtn color="primary" @click="confirmInsert">Insert</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <VDialog :model-value="!!deleting" max-width="400" @update:model-value="deleting = null">
      <VCard
        title="Delete saved component?"
        text="Instances on your pages stay as ordinary copies. You can restore it from Recently deleted."
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
  cursor: pointer;
  min-height: 30px;
}

.deleted {
  margin-top: 16px;
}

.deleted__title {
  margin: 0 6px 4px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  opacity: 0.65;
}

.prefab-row--deleted {
  cursor: default;
  opacity: 0.7;
}

.prefab-row--active {
  background: rgba(var(--v-theme-primary), 0.12);
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
