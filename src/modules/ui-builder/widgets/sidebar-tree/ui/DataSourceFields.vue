<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  DEFAULT_DELAY_MS,
  endpointError,
  MAX_DELAY_MS,
  useUiTreeStore,
  variableNameError,
} from '../../../entities/ui-node'
import { ImportDataButton } from '../../../features/import-data'

/** Where a variable's data comes from: a file imported as its value, or a mock endpoint Preview pretends to call. */
const props = defineProps<{ name: string }>()
const store = useUiTreeStore()

const source = computed(() => store.project.sources?.[props.name])
const url = ref('')
const delay = ref('')
const loading = ref('')
watch(
  source,
  value => {
    url.value = value?.url ?? ''
    delay.value = String(value?.delayMs ?? DEFAULT_DELAY_MS)
    loading.value = value?.loadingVariable ?? ''
  },
  { immediate: true },
)

const urlProblem = computed(() => (url.value.trim() ? endpointError(url.value.trim()) : null))
const delayProblem = computed(() => {
  const value = Number(delay.value)
  return Number.isFinite(value) && value >= 0 && value <= MAX_DELAY_MS ? null : `Use 0 to ${MAX_DELAY_MS}.`
})
const loadingProblem = computed(() => {
  const name = loading.value.trim()
  if (!name) return null
  return name === props.name ? 'Use another variable.' : variableNameError(name)
})

// Applied when a field is left; clearing the address removes the data source.
const apply = () => {
  const address = url.value.trim()
  if (!address) {
    if (source.value) store.setDataSource(props.name, null)
    return
  }
  if (urlProblem.value || delayProblem.value || loadingProblem.value) return
  const next = { url: address, delayMs: Number(delay.value), loadingVariable: loading.value.trim() || undefined }
  if (JSON.stringify(next) !== JSON.stringify(source.value)) store.setDataSource(props.name, next)
}
</script>

<template>
  <div class="data-source">
    <ImportDataButton @imported="value => store.setStateVariable(name, value)" />
    <VTextField
      v-model="url"
      label="Mock endpoint"
      placeholder="/api/orders"
      :error-messages="urlProblem ?? []"
      variant="outlined"
      density="compact"
      hide-details="auto"
      spellcheck="false"
      @blur="apply"
      @keydown.enter="apply"
    />
    <template v-if="url.trim()">
      <p class="text-caption text-medium-emphasis">
        Preview starts empty and shows the starting value after the delay; no request is sent. Exported code calls the
        address with <code>fetch</code>.
      </p>
      <VTextField
        v-model="delay"
        label="Delay, ms"
        inputmode="numeric"
        :error-messages="delayProblem ?? []"
        variant="outlined"
        density="compact"
        hide-details="auto"
        @blur="apply"
        @keydown.enter="apply"
      />
      <VTextField
        v-model="loading"
        label="Loading variable (optional)"
        placeholder="loading"
        :error-messages="loadingProblem ?? []"
        variant="outlined"
        density="compact"
        hide-details="auto"
        spellcheck="false"
        @blur="apply"
        @keydown.enter="apply"
      />
    </template>
  </div>
</template>

<style scoped>
.data-source {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.data-source p {
  margin: 0;
}
</style>
