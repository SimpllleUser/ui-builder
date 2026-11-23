<script setup lang="ts">
import { computed, ref } from 'vue'
import { isJsonRecord, jsonKeyError, JsonKind } from '../lib/jsonTree'

/** Name and kind of a new item for an object (arrays only ask for the kind). */
const props = defineProps<{ parent: unknown }>()
const emit = defineEmits<{ add: [key: string, kind: JsonKind]; cancel: [] }>()

const key = ref('')
const kind = ref(JsonKind.String)
const touched = ref(false)
const needsKey = computed(() => isJsonRecord(props.parent))
const keyError = computed(() => (touched.value ? jsonKeyError(props.parent, key.value) : null))
const kinds = Object.values(JsonKind)

const submit = () => {
  touched.value = true
  if (jsonKeyError(props.parent, key.value)) return
  emit('add', key.value.trim(), kind.value)
}
</script>

<template>
  <VCard class="pa-3" min-width="240" @keydown.enter.prevent="submit">
    <VTextField
      v-if="needsKey"
      v-model="key"
      label="Name"
      variant="outlined"
      density="compact"
      autofocus
      :error-messages="keyError ?? []"
      class="mb-2"
      @update:model-value="touched = true"
    />
    <VSelect v-model="kind" :items="kinds" label="Kind" variant="outlined" density="compact" hide-details />
    <div class="d-flex justify-end ga-2 mt-3">
      <VBtn size="small" variant="text" @click="emit('cancel')">Cancel</VBtn>
      <VBtn size="small" color="primary" @click="submit">Add</VBtn>
    </div>
  </VCard>
</template>
