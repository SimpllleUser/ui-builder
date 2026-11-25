<script setup lang="ts">
import { computed, ref } from 'vue'
import { SaveState, useUiTreeStore } from '../../../../ui-builder/entities/ui-node'
import { Takeover, type ProjectSession } from '../../../features/manage-projects'
import { ProjectDialog } from '../model/projectDialog'

const props = defineProps<{ session: ProjectSession }>()
const emit = defineEmits<{ open: [dialog: ProjectDialog] }>()

const store = useUiTreeStore()
const name = computed(() => props.session.currentProject.value?.name ?? 'This project')
const hasUnsaved = computed(() => store.saveState !== SaveState.Saved)
const waiting = ref(false)
const noAnswer = ref(false)
const failure = ref('')

const attempt = async (action: () => Promise<unknown>) => {
  waiting.value = true
  failure.value = ''
  try {
    await action()
  } catch (error) {
    failure.value = error instanceof Error ? error.message : 'This did not work. Try again.'
  } finally {
    waiting.value = false
  }
}
const editHere = (takeover: Takeover) =>
  attempt(async () => {
    noAnswer.value = !(await props.session.editHere(takeover))
  })
</script>

<template>
  <div class="d-flex flex-grow-1 align-center justify-center pa-4">
    <VCard max-width="480" variant="outlined" :title="`“${name}” is open in another tab`">
      <VCardText>
        <p>One tab edits a project at a time, so no changes get lost.</p>
        <p v-if="noAnswer" class="text-warning mt-2" role="alert">
          The other tab did not let it go. Taking over anyway keeps what it has not saved only in that tab.
        </p>
        <p v-if="failure" class="text-error mt-2" role="alert">{{ failure }}</p>
      </VCardText>
      <VCardActions class="flex-wrap ga-2">
        <VBtn color="primary" variant="flat" :loading="waiting" @click="editHere(Takeover.Ask)">Edit here</VBtn>
        <VBtn v-if="noAnswer" color="warning" variant="tonal" :disabled="waiting" @click="editHere(Takeover.Force)">
          Take over anyway
        </VBtn>
        <VBtn v-if="hasUnsaved" variant="tonal" :disabled="waiting" @click="attempt(session.saveAsCopy)">
          Keep mine as a copy
        </VBtn>
        <VBtn variant="text" @click="emit('open', ProjectDialog.List)">Other projects…</VBtn>
      </VCardActions>
    </VCard>
  </div>
</template>
