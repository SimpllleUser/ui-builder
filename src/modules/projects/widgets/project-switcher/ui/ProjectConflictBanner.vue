<script setup lang="ts">
import { computed } from 'vue'
import { ProjectConflict, type ProjectSession } from '../../../features/manage-projects'
import { useAttempt } from '../model/useAttempt'

const props = defineProps<{ session: ProjectSession }>()

const conflict = computed(() => props.session.conflict.value)
const { failure, attempt } = useAttempt()
</script>

<template>
  <VAlert v-if="conflict" type="warning" variant="tonal" density="compact" class="flex-grow-0 ma-2" role="alert">
    <template v-if="conflict === ProjectConflict.Changed">
      This project was changed in another tab, so this tab no longer saves it.
    </template>
    <template v-else>This project was deleted in another tab.</template>
    <div v-if="failure" class="text-error">{{ failure }}</div>
    <div class="d-flex flex-wrap ga-2 mt-2">
      <VBtn size="small" variant="flat" @click="attempt(session.saveAsCopy)">Keep mine as a copy</VBtn>
      <VBtn
        v-if="conflict === ProjectConflict.Changed"
        size="small"
        variant="text"
        @click="attempt(session.reloadCurrent)"
      >
        Load their version (drop mine)
      </VBtn>
      <VBtn v-else size="small" variant="text" @click="attempt(session.leaveDeleted)">Open another project</VBtn>
    </div>
  </VAlert>
</template>
