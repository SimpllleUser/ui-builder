<script setup lang="ts">
import { computed } from 'vue'
import {
  BooleanText,
  PrefabPropType,
  prefabPropType,
  prefabValueError,
  type PrefabProp,
} from '../../../entities/ui-node'

/** One value of a parameter, with the input its type calls for and what is wrong with it beside. */
const props = defineProps<{ parameter: PrefabProp; modelValue: string; label?: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const type = computed(() => prefabPropType(props.parameter))
const error = computed(() => prefabValueError(props.parameter, props.modelValue) ?? '')
const title = computed(() => `${props.label ?? props.parameter.name}${props.parameter.required ? ' *' : ''}`)
const choices = computed(() =>
  type.value === PrefabPropType.Boolean ? Object.values(BooleanText) : (props.parameter.options ?? []),
)
const isList = computed(() => [PrefabPropType.Boolean, PrefabPropType.Choice].includes(type.value))
// A cleared field gives null.
const update = (value: unknown) => emit('update:modelValue', typeof value === 'string' ? value : '')
</script>

<template>
  <VSelect
    v-if="isList"
    :model-value="modelValue || null"
    :items="choices"
    :label="title"
    :clearable="!parameter.required"
    :error-messages="error"
    variant="outlined"
    density="compact"
    hide-details="auto"
    class="mb-2"
    @update:model-value="update"
  />
  <VTextField
    v-else
    :model-value="modelValue"
    :label="title"
    :inputmode="type === PrefabPropType.Number ? 'decimal' : undefined"
    :error-messages="error"
    :counter="parameter.maxLength"
    variant="outlined"
    density="compact"
    hide-details="auto"
    class="mb-2"
    @update:model-value="update"
  />
</template>
