<script setup lang="ts">
import { ref, watch } from 'vue'
import { useUiTreeStore } from '../../../../entities/ui-node/model/store'
import type { UiNode } from '../../../../entities/ui-node/model/types'

/** A setting that holds JSON, or a `{{variable}}` binding to the project's state. */
const props = defineProps<{ node: UiNode; prop: string; label: string }>()
const store = useUiTreeStore()
const error = ref('')
watch(
  () => props.node.id,
  () => (error.value = ''),
)

const text = () => {
  const value = props.node.props[props.prop]
  return typeof value === 'string' ? value : value === undefined ? '' : JSON.stringify(value, null, 2)
}
const set = (value: unknown) => store.updateNodeProp(props.node.id, props.prop, value)

/** JSON is stored parsed; text such as {{orders}} is kept as a binding to project state. */
const update = (input: string) => {
  const trimmed = input.trim()
  error.value = ''
  if (!trimmed) return set(undefined)
  if (trimmed.startsWith('{{')) return set(trimmed)
  try {
    set(JSON.parse(trimmed))
  } catch {
    error.value = 'Invalid JSON — the last valid value is kept.'
  }
}
</script>

<template>
  <VTextarea
    :model-value="text()"
    :label="label"
    :error-messages="error"
    variant="outlined"
    density="compact"
    auto-grow
    rows="3"
    class="mb-3 json-field"
    hide-details="auto"
    spellcheck="false"
    @update:model-value="update"
  />
</template>
