<script setup lang="ts">
import { canSavePrefabName } from '../model/propertyPanelUtils'

defineProps<{
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
          hide-details
          @update:model-value="updateName"
          @keydown.enter="emit('save')"
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
        <VBtn color="primary" :disabled="!canSavePrefabName(name)" @click="emit('save')">Save component</VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>
