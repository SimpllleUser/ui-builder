<script setup lang="ts" generic="Value extends string">
import type { ToggleOption } from '../model/options'

defineProps<{ options: ToggleOption<Value>[]; label: string }>()
const selected = defineModel<Value>({ required: true })
</script>

<template>
  <VBtnToggle
    v-model="selected"
    color="primary"
    variant="outlined"
    divided
    mandatory
    class="option-toggle"
    :aria-label="label"
  >
    <VBtn v-for="option in options" :key="option.value" :value="option.value" class="option-toggle__button text-none">
      <VIcon v-if="option.icon" :icon="option.icon" start aria-hidden="true" />
      {{ option.label }}
    </VBtn>
  </VBtnToggle>
</template>

<style scoped>
.option-toggle {
  display: flex;
  width: 100%;
}
.option-toggle__button {
  flex: 1 1 0;
}
</style>
