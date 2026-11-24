<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { canSavePrefabName } from '../model/propertyPanelUtils'

const props = defineProps<{
  modelValue: boolean
  name: string
  propNames: string[]
  defaults: Record<string, string>
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'update:name': [value: string]
  'update:default': [name: string, value: string]
  save: []
}>()

// Save stays pressable: pressing it with an empty name says what is missing beside the field instead of doing nothing.
const triedToSave = ref(false)
const nameError = computed(() =>
  triedToSave.value && !canSavePrefabName(props.name) ? 'Give the component a name.' : undefined,
)
watch(
  () => props.modelValue,
  () => (triedToSave.value = false),
)
const save = () => {
  triedToSave.value = true
  if (canSavePrefabName(props.name)) emit('save')
}

const updateName = (value: unknown) => {
  if (typeof value === 'string') emit('update:name', value)
}

const updateDefault = (propName: string, value: unknown) => {
  if (typeof value === 'string') emit('update:default', propName, value)
}
</script>

<template>
  <VDialog :model-value="modelValue" max-width="420" @update:model-value="emit('update:modelValue', $event)">
    <VCard title="Save component">
      <VCardText>
        <VTextField
          :model-value="name"
          label="Component name"
          autofocus
          variant="outlined"
          :error-messages="nameError"
          hide-details="auto"
          @update:model-value="updateName"
          @keydown.enter="save"
        />
        <div class="text-caption text-medium-emphasis mt-3">
          Write <code v-pre>{{ props.title }}</code> in a text or property to make it a parameter of the component.
        </div>
        <template v-if="propNames.length">
          <div class="text-subtitle-2 mt-3 mb-2">Parameters (default values)</div>
          <VTextField
            v-for="propName in propNames"
            :key="propName"
            :model-value="defaults[propName] ?? ''"
            :label="propName"
            variant="outlined"
            density="compact"
            hide-details
            class="mb-2"
            @update:model-value="updateDefault(propName, $event)"
          />
        </template>
      </VCardText>
      <VCardActions>
        <VSpacer />
        <VBtn @click="emit('update:modelValue', false)">Cancel</VBtn>
        <VBtn color="primary" @click="save">Save component</VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>
