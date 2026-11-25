<script setup lang="ts">
import { computed, ref } from 'vue'
import { SaveState, useUiTreeStore } from '../../../../ui-builder/entities/ui-node'
import { Takeover, type ProjectSession } from '../../../features/manage-projects'
import { ProjectDialog } from '../model/projectDialog'
import { useAttempt } from '../model/useAttempt'

const props = defineProps<{ session: ProjectSession }>()
const emit = defineEmits<{ open: [dialog: ProjectDialog] }>()

const store = useUiTreeStore()
const name = computed(() => props.session.currentProject.value?.name ?? 'This project')
const hasUnsaved = computed(() => store.saveState !== SaveState.Saved)
const noAnswer = ref(false)
const { failure, busy: waiting, attempt } = useAttempt()

const editHere = (takeover: Takeover) =>
  attempt(async () => {
    noAnswer.value = !(await props.session.editHere(takeover))
  })
</script>

<template>
  <div class="locked-project">
    <VAlert type="info" variant="tonal" density="compact" class="flex-grow-0 ma-2" icon="mdi-lock-outline">
      <strong>“{{ name }}” is open in another tab.</strong>
      This is a read-only view: one tab edits a project at a time, so no changes get lost.
      <div v-if="noAnswer" class="text-warning mt-1" role="alert">
        The other tab did not let it go. Taking over anyway keeps what it has not saved only in that tab.
      </div>
      <div v-if="failure" class="text-error mt-1" role="alert">{{ failure }}</div>
      <div class="d-flex flex-wrap ga-2 mt-2">
        <VBtn size="small" color="primary" variant="flat" :loading="waiting" @click="editHere(Takeover.Ask)">
          Edit here
        </VBtn>
        <VBtn
          v-if="noAnswer"
          size="small"
          color="warning"
          variant="tonal"
          :disabled="waiting"
          @click="editHere(Takeover.Force)"
        >
          Take over anyway
        </VBtn>
        <VBtn v-if="hasUnsaved" size="small" variant="tonal" :disabled="waiting" @click="attempt(session.saveAsCopy)">
          Keep mine as a copy
        </VBtn>
        <VBtn size="small" variant="text" @click="emit('open', ProjectDialog.List)">Other projects…</VBtn>
      </div>
    </VAlert>
    <div class="locked-project__view">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.locked-project {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
}
.locked-project__view {
  flex: 1;
  min-height: 0;
}
</style>
