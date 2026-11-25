<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { isComputed, parseLiteral, useUiTreeStore, variableNameError, variableNames } from '../../../entities/ui-node'

/**
 * Picks a variable by name. A name that does not exist yet is accepted and the parent creates the variable,
 * so nobody has to leave the inspector to define it. The variable's starting value can be edited here too.
 */
const props = defineProps<{
  modelValue?: string
  label: string
  title?: string
  hint?: string
  /** What is wrong with the current choice, said by the parent. */
  problem?: string
}>()
const emit = defineEmits<{ 'update:modelValue': [name: string] }>()
const store = useUiTreeStore()

const names = computed(() => variableNames(store.project))
const draft = ref(props.modelValue ?? '')
const menu = ref(false)
watch(
  () => props.modelValue,
  value => (draft.value = value ?? ''),
)

// Typing must not create a variable for every letter: apply on Enter, on leaving the field, or when picking from the list.
const nameProblem = ref<string | null>(null)
const commit = () => {
  menu.value = false
  const name = draft.value.trim()
  // A name that cannot be a variable stays in the field with the reason, instead of failing in a passing message.
  nameProblem.value = name ? variableNameError(name) : null
  if (nameProblem.value) return
  if (name !== (props.modelValue ?? '')) emit('update:modelValue', name)
}
// The list handles Enter itself after this runs, so close it on the next tick.
const commitAndClose = () => {
  commit()
  setTimeout(() => (menu.value = false))
}
const onInput = (value: string | null) => {
  draft.value = value ?? ''
  nameProblem.value = null
  if (!draft.value || names.value.includes(draft.value)) commit()
}

const exists = computed(() => !!props.modelValue && props.modelValue in store.project.state)
const formula = computed(() =>
  props.modelValue && isComputed(store.project, props.modelValue) ? store.project.computed![props.modelValue] : null,
)
const startValue = computed(() => {
  const value = props.modelValue ? store.project.state[props.modelValue] : undefined
  return typeof value === 'string' ? value : JSON.stringify(value)
})
const setStartValue = (text: string) => {
  if (props.modelValue) store.setStateVariable(props.modelValue, parseLiteral(text))
}
</script>

<template>
  <div class="variable-field">
    <VCombobox
      v-model:menu="menu"
      :model-value="draft"
      :items="names"
      :label="label"
      :title="title"
      :hint="hint"
      :persistent-hint="!!hint"
      :error-messages="nameProblem ?? problem ?? []"
      variant="outlined"
      density="compact"
      hide-details="auto"
      clearable
      @update:model-value="onInput"
      @blur="commit"
      @keydown.enter="commitAndClose"
    />
    <p v-if="formula" class="variable-field__start text-medium-emphasis">Computed: {{ formula }}</p>
    <VTextField
      v-if="exists"
      :model-value="startValue"
      label="Starts as"
      title="The value this variable has each time Preview starts. Use true, 3, text, or JSON like [1, 2]."
      variant="plain"
      density="compact"
      hide-details
      class="variable-field__start"
      @change="(event: Event) => setStartValue((event.target as HTMLInputElement).value)"
    />
  </div>
</template>

<style scoped>
.variable-field__start {
  margin-top: 2px;
  padding-left: 12px;
  font-size: 12px;
}
</style>
