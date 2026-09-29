<script setup lang="ts">
type MoveTarget = { title: string; value: string }

defineProps<{
  modelValue: boolean
  target: string
  targets: MoveTarget[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'update:target': [value: string]
  move: []
}>()

const updateTarget = (value: unknown) => {
  if (typeof value === 'string') emit('update:target', value)
}
</script>

<template>
  <VDialog
    :model-value="modelValue"
    max-width="520"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <VCard title="Move element">
      <VCardText>
        <VSelect
          :model-value="target"
          :items="targets"
          label="Destination container or slot"
          variant="outlined"
          hide-details
          @update:model-value="updateTarget"
        />
      </VCardText>
      <VCardActions>
        <VSpacer />
        <VBtn @click="emit('update:modelValue', false)">Cancel</VBtn>
        <VBtn color="primary" :disabled="!target" @click="emit('move')">Move</VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>
