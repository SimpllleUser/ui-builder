<script setup lang="ts">
import { computed, ref } from 'vue'
import { projectNameError, type ProjectMeta } from '../../../entities/project'

const props = defineProps<{
  title: string
  action: string
  projects: ProjectMeta[]
  initialName?: string
  /** The project being renamed: its own name is not "taken". */
  ownId?: string
}>()
const emit = defineEmits<{ submit: [name: string]; cancel: [] }>()

const name = ref(props.initialName ?? '')
// An empty field is not an error until the button is pressed.
const tried = ref(false)
const problem = computed(() => projectNameError(props.projects, name.value, props.ownId))
const shownProblem = computed(() => (tried.value || name.value ? (problem.value ?? undefined) : undefined))
const submit = () => {
  tried.value = true
  if (!problem.value) emit('submit', name.value)
}
</script>

<template>
  <VDialog :model-value="true" max-width="420" @update:model-value="emit('cancel')">
    <VCard :title="title">
      <form @submit.prevent="submit">
        <VCardText>
          <VTextField
            v-model="name"
            :error-messages="shownProblem"
            label="Project name"
            variant="outlined"
            density="compact"
            hide-details="auto"
            autofocus
          />
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn @click="emit('cancel')">Cancel</VBtn>
          <VBtn type="submit" color="primary" variant="tonal">{{ action }}</VBtn>
        </VCardActions>
      </form>
    </VCard>
  </VDialog>
</template>
