<script setup lang="ts">
import { ref } from 'vue'
import { MAX_DATA_FILE_BYTES, parseDataFile } from '../model/parseDataFile'

/** Picks a JSON or CSV file and hands over its value. A file that cannot be read says why next to the button. */
const emit = defineEmits<{ imported: [value: unknown] }>()

const input = ref<HTMLInputElement>()
const problem = ref('')

const read = async () => {
  const file = input.value?.files?.[0]
  if (!file) return
  problem.value = ''
  try {
    // Checked before reading, so a huge file is not loaded only to be refused.
    if (file.size > MAX_DATA_FILE_BYTES * 2) throw new Error('The file is too large.')
    emit('imported', parseDataFile(file.name, await file.text()))
  } catch (error) {
    problem.value = error instanceof Error ? error.message : 'The file cannot be read.'
  }
  // The same file can be picked again.
  if (input.value) input.value.value = ''
}
</script>

<template>
  <div>
    <VBtn size="x-small" variant="tonal" prepend-icon="mdi-file-upload-outline" @click="input?.click()">
      Import JSON or CSV
    </VBtn>
    <input ref="input" type="file" accept=".json,.csv,application/json,text/csv" hidden @change="read" />
    <p v-if="problem" class="text-caption text-error" role="alert">{{ problem }}</p>
  </div>
</template>
