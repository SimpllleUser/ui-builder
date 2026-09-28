<script setup lang="ts">
defineProps<{
  modelValue: boolean
  name: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'update:name': [value: string]
  save: []
}>()

const updateName = (value: unknown) => {
  if (typeof value === 'string') emit('update:name', value)
}
</script>

<template>
  <VDialog
    :model-value="modelValue"
    max-width="420"
    @update:model-value="emit('update:modelValue', $event)"
  >
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
      </VCardText>
      <VCardActions>
        <VSpacer />
        <VBtn @click="emit('update:modelValue', false)">Cancel</VBtn>
        <VBtn color="primary" :disabled="!name.trim()" @click="emit('save')">Save component</VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>
