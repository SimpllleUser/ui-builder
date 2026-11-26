<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  PREFAB_PROP_TYPE_LABELS,
  PrefabPropType,
  prefabPropErrors,
  prefabPropNameError,
  prefabPropType,
  type PrefabProp,
} from '../../../entities/ui-node'
import ParameterValueField from './ParameterValueField.vue'

/** Creates or changes a parameter, in the order of a database column form: type, key, limits, default, required. */
const props = defineProps<{
  modelValue: boolean
  /** The parameter being changed, or null for a new one. */
  parameter: PrefabProp | null
  takenNames: string[]
}>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean]; save: [parameter: PrefabProp] }>()

const TYPE_ICONS: Record<PrefabPropType, string> = {
  [PrefabPropType.Text]: 'mdi-format-text',
  [PrefabPropType.Number]: 'mdi-numeric',
  [PrefabPropType.Boolean]: 'mdi-toggle-switch-outline',
  [PrefabPropType.Choice]: 'mdi-format-list-bulleted',
  [PrefabPropType.Color]: 'mdi-palette-outline',
  [PrefabPropType.Link]: 'mdi-link-variant',
}
const types = Object.values(PrefabPropType)

const type = ref(PrefabPropType.Text)
const name = ref('')
const defaultValue = ref('')
const required = ref(false)
const min = ref('')
const max = ref('')
const maxLength = ref('')
const options = ref<string[]>([])
const triedToSave = ref(false)

watch(
  () => props.modelValue,
  open => {
    if (!open) return
    const current = props.parameter
    type.value = current ? prefabPropType(current) : PrefabPropType.Text
    name.value = current?.name ?? ''
    defaultValue.value = current?.defaultValue ?? ''
    required.value = current?.required ?? false
    min.value = current?.min?.toString() ?? ''
    max.value = current?.max?.toString() ?? ''
    maxLength.value = current?.maxLength?.toString() ?? ''
    options.value = [...(current?.options ?? [])]
    triedToSave.value = false
  },
  { immediate: true },
)

const optionalNumber = (text: string) => (text.trim() && Number.isFinite(Number(text)) ? Number(text) : undefined)
/** Only the limits of the chosen type are kept. */
const draft = computed<PrefabProp>(() => {
  const limits: Partial<PrefabProp> = {
    ...(type.value === PrefabPropType.Number ? { min: optionalNumber(min.value), max: optionalNumber(max.value) } : {}),
    ...(type.value === PrefabPropType.Text ? { maxLength: optionalNumber(maxLength.value) } : {}),
    ...(type.value === PrefabPropType.Choice ? { options: options.value } : {}),
  }
  return {
    name: name.value,
    type: type.value,
    defaultValue: defaultValue.value,
    ...(required.value ? { required: true } : {}),
    ...Object.fromEntries(Object.entries(limits).filter(([, value]) => value !== undefined)),
    ...(!props.parameter || props.parameter.isDeclared ? { isDeclared: true } : {}),
  }
})
const errors = computed(() => prefabPropErrors(draft.value))
const nameError = computed(() =>
  props.parameter || (!triedToSave.value && !name.value)
    ? ''
    : (prefabPropNameError(name.value, props.takenNames) ?? ''),
)

const chooseType = (next: PrefabPropType) => {
  // A default of one type rarely means anything in another.
  if (next !== type.value) defaultValue.value = ''
  type.value = next
}
const save = () => {
  triedToSave.value = true
  if (nameError.value || Object.keys(errors.value).length) return
  emit('save', draft.value)
  emit('update:modelValue', false)
}
</script>

<template>
  <VDialog :model-value="modelValue" max-width="440" scrollable @update:model-value="emit('update:modelValue', $event)">
    <VCard :title="parameter ? `Parameter ${parameter.name}` : 'Create parameter'">
      <VCardText>
        <div class="type-grid" role="radiogroup" aria-label="Type">
          <button
            v-for="item in types"
            :key="item"
            type="button"
            role="radio"
            class="type-option"
            :class="{ 'type-option--on': item === type }"
            :aria-checked="item === type"
            @click="chooseType(item)"
          >
            <VIcon :icon="TYPE_ICONS[item]" size="18" aria-hidden="true" />
            {{ PREFAB_PROP_TYPE_LABELS[item] }}
          </button>
        </div>

        <VTextField
          v-model="name"
          label="Key"
          :readonly="!!parameter"
          :error-messages="nameError"
          :hint="`Use it in the component as {{props.${name || 'key'}}}`"
          persistent-hint
          variant="outlined"
          density="compact"
          class="mb-2"
        />

        <VTextField
          v-if="type === PrefabPropType.Text"
          v-model="maxLength"
          label="Size (max characters)"
          inputmode="numeric"
          :error-messages="errors.limits"
          variant="outlined"
          density="compact"
          hide-details="auto"
          class="mb-2"
        />
        <div v-if="type === PrefabPropType.Number" class="limits">
          <VTextField v-model="min" label="Min" inputmode="decimal" variant="outlined" density="compact" hide-details />
          <VTextField v-model="max" label="Max" inputmode="decimal" variant="outlined" density="compact" hide-details />
          <p v-if="errors.limits" class="limits__error" role="alert">{{ errors.limits }}</p>
        </div>
        <VCombobox
          v-if="type === PrefabPropType.Choice"
          v-model="options"
          label="Options (Enter adds one)"
          multiple
          chips
          closable-chips
          :error-messages="triedToSave ? errors.options : ''"
          variant="outlined"
          density="compact"
          hide-details="auto"
          class="mb-2"
        />

        <ParameterValueField v-model="defaultValue" :parameter="{ ...draft, required: false }" label="Default value" />
        <VSwitch v-model="required" label="Required" color="primary" density="compact" hide-details />
        <p class="required-hint">An instance of the component may not leave a required parameter empty.</p>
      </VCardText>
      <VCardActions>
        <VSpacer />
        <VBtn @click="emit('update:modelValue', false)">Cancel</VBtn>
        <VBtn color="primary" @click="save">{{ parameter ? 'Update' : 'Create' }}</VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>

<style scoped>
.type-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  margin-bottom: 16px;
}
.type-option {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 40px;
  padding: 0 10px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 6px;
  font-size: 12px;
}
.type-option--on {
  border-color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.12);
}
.limits {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  margin-bottom: 8px;
}
.limits__error {
  grid-column: 1 / -1;
  color: rgb(var(--v-theme-error));
  font-size: 12px;
}
.required-hint {
  font-size: 12px;
  opacity: 0.6;
}
</style>
