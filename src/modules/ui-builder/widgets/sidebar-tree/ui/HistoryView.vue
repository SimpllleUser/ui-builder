<script setup lang="ts">
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useUiTreeStore } from '../../../entities/ui-node'
import { shortDateTime, timeAgo } from '../model/timeAgo'

/** Every named change that can be restored, and checkpoints the person saved on purpose. */
const store = useUiTreeStore()
// While a saved component is edited, the versions are its own; checkpoints hold the project, so they wait.
const { historyVersions, historyPending, checkpoints, editingPrefab } = storeToRefs(store)

const dialog = ref(false)
const name = ref('')
const openDialog = () => {
  name.value = `Checkpoint ${checkpoints.value.length + 1}`
  dialog.value = true
}
const save = () => {
  if (store.createCheckpoint(name.value)) dialog.value = false
}
</script>

<template>
  <div class="sidebar-view__scroll history-list" aria-label="Document history">
    <p v-if="editingPrefab" class="history-help">
      Versions of the component <strong>{{ editingPrefab.name }}</strong>. Every instance follows the one you select.
    </p>
    <p class="history-help">
      Select a version to restore it. <span v-if="historyPending">Unsaved changes will be saved first.</span
      ><span v-else>Older versions remain available until the history limit is reached.</span>
    </p>
    <VBtn
      v-if="!editingPrefab"
      block
      size="small"
      color="primary"
      variant="tonal"
      prepend-icon="mdi-bookmark-plus-outline"
      class="history-save"
      @click="openDialog"
      >Save checkpoint</VBtn
    >

    <div v-if="!editingPrefab && checkpoints.length" class="history-section">
      <h3 class="history-section__title">Checkpoints</h3>
      <div v-for="checkpoint in checkpoints" :key="checkpoint.checkpointId" class="checkpoint-item">
        <button class="checkpoint-restore" @click="store.restoreCheckpoint(checkpoint.checkpointId)">
          <VIcon icon="mdi-bookmark-outline" size="16" aria-hidden="true" />
          <span
            ><strong>{{ checkpoint.name }}</strong
            ><small>{{ shortDateTime.format(checkpoint.createdAt) }}</small></span
          >
        </button>
        <VBtn
          icon="mdi-delete-outline"
          variant="text"
          size="x-small"
          color="error"
          :aria-label="`Delete ${checkpoint.name}`"
          @click="store.deleteCheckpoint(checkpoint.checkpointId)"
        />
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
      <span class="history-label">{{ version.label }}</span>
      <span class="history-time">{{ timeAgo(version.at) }}</span>
      <span v-if="version.isCurrent" class="history-current">Current</span>
    </button>

    <VDialog v-model="dialog" max-width="400">
      <VCard title="Save checkpoint">
        <VCardText>
          <VTextField v-model="name" label="Checkpoint name" autofocus hide-details @keyup.enter="save" />
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn @click="dialog = false">Cancel</VBtn>
          <VBtn color="primary" :disabled="!name.trim()" @click="save">Save</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </div>
</template>

<style scoped>
.history-list {
  padding: 8px;
}

.history-help {
  margin: 4px 4px 10px;
  color: rgb(var(--v-theme-on-surface));
  font-size: 12px;
  opacity: 0.7;
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
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  opacity: 0.65;
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
  background: rgba(var(--v-theme-on-surface), 0.06);
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
  font-size: 12px;
  opacity: 0.6;
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
  background: rgba(var(--v-theme-primary), 0.1);
}

.history-label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-time {
  flex-shrink: 0;
  font-size: 12px;
  opacity: 0.6;
}

.history-current {
  flex-shrink: 0;
  color: rgb(var(--v-theme-primary));
  font-size: 12px;
}
</style>
