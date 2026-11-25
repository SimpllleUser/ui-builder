<script setup lang="ts">
import { computed } from 'vue'
import {
  actionLabel,
  ActionType,
  createAction,
  isActionType,
  isComputed,
  lacksVariable,
  newVariableValue,
  useUiTreeStore,
  variableNames,
  type UiAction,
} from '../../../entities/ui-node'
import VariableField from './VariableField.vue'
import { useEnsureVariable } from '../model/useEnsureVariable'

/** One action of an event: what to do and with what. */
const props = defineProps<{
  action?: UiAction
  /** The row or the new value can be used, which the labels say. */
  valueHint?: string
}>()
const emit = defineEmits<{ change: [action: UiAction | undefined] }>()
const store = useUiTreeStore()
const ensureVariable = useEnsureVariable(store)

const NO_ACTION = 'none'
const actionTypes = [
  { title: 'Nothing', value: NO_ACTION },
  ...Object.values(ActionType).map(type => ({ title: actionLabel(type), value: type })),
]
const VALUE_LABELS: Partial<Record<ActionType, string>> = {
  [ActionType.Set]: 'New value (true, 3, text)',
  [ActionType.Append]: 'Value to add (text, {{ name }} or JSON)',
  [ActionType.Remove]: 'Value to remove, e.g. {{ item }}',
}

// The field keeps the item's title, so the title must be the route itself; the page name goes in the subtitle.
const pageItems = computed(() => store.pages.map(page => ({ title: page.path, subtitle: page.name, value: page.path })))
// Going to a route no page has would do nothing in Preview; say so next to the field.
const routeProblem = computed(() => {
  const to = props.action?.type === ActionType.Navigate ? props.action.to.trim() : ''
  if (!to || to.includes('{{') || store.pages.some(page => page.path === to)) return null
  return 'No page has this route yet. Pick a page from the list or add one.'
})
const variableProblem = computed(() => {
  const action = props.action
  if (!action) return undefined
  if (lacksVariable(action)) return 'Choose a variable. Until then this action does nothing.'
  return 'key' in action && isComputed(store.project, action.key)
    ? 'This variable is computed and cannot be changed.'
    : undefined
})

const changeType = (type: unknown) => {
  const defaults = {
    path: store.pages[0]?.path ?? '/',
    variable: variableNames(store.project).find(name => !isComputed(store.project, name)) ?? '',
  }
  emit('change', isActionType(type) ? createAction(type, defaults) : undefined)
}
const setPath = (to: string) => props.action?.type === ActionType.Navigate && emit('change', { ...props.action, to })
const setMessage = (message: string) =>
  props.action?.type === ActionType.Notify && emit('change', { ...props.action, message })
const setValue = (value: string) =>
  props.action && 'value' in props.action && emit('change', { ...props.action, value })
const setKey = (key: string) => {
  if (!props.action || !('key' in props.action)) return
  ensureVariable(key, newVariableValue(props.action.type))
  emit('change', { ...props.action, key })
}
</script>

<template>
  <VSelect
    :model-value="action?.type ?? NO_ACTION"
    :items="actionTypes"
    label="Then"
    variant="outlined"
    density="compact"
    hide-details
    class="mb-3"
    @update:model-value="changeType"
  />
  <VCombobox
    v-if="action?.type === ActionType.Navigate"
    :model-value="action.to"
    :items="pageItems"
    item-title="title"
    item-value="value"
    :return-object="false"
    label="Page"
    :error-messages="routeProblem ?? []"
    variant="outlined"
    density="compact"
    hide-details="auto"
    @update:model-value="value => setPath(String(value ?? ''))"
  />
  <VTextField
    v-else-if="action?.type === ActionType.Notify"
    :model-value="action.message"
    label="Message"
    variant="outlined"
    density="compact"
    hide-details
    @update:model-value="value => setMessage(value ?? '')"
  />
  <p v-else-if="action?.type === ActionType.ResetForm" class="text-caption text-medium-emphasis">
    Puts the fields of the surrounding form back to their starting values.
  </p>
  <template v-else-if="action && 'key' in action">
    <VariableField label="Variable" :model-value="action.key" :problem="variableProblem" @update:model-value="setKey" />
    <VTextField
      v-if="'value' in action"
      :model-value="action.value"
      :label="VALUE_LABELS[action.type]"
      :hint="valueHint"
      :persistent-hint="!!valueHint"
      variant="outlined"
      density="compact"
      hide-details="auto"
      class="mt-3"
      @update:model-value="value => setValue(value ?? '')"
    />
  </template>
</template>
