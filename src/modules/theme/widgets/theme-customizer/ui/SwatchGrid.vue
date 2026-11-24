<script setup lang="ts" generic="Value extends string">
import type { SwatchOption } from '../model/options'

defineProps<{ options: SwatchOption<Value>[]; label: string; columns?: number }>()
const selected = defineModel<Value>({ required: true })
</script>

<template>
  <div class="swatch-grid" role="radiogroup" :aria-label="label" :style="{ '--swatch-columns': columns ?? 3 }">
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      role="radio"
      class="swatch"
      :class="{ 'swatch--selected': option.value === selected }"
      :aria-checked="option.value === selected"
      @click="selected = option.value"
    >
      <span class="swatch__dots" aria-hidden="true">
        <span v-for="(color, index) in option.colors" :key="index" class="swatch__dot" :style="{ background: color }" />
      </span>
      <span class="swatch__label">{{ option.label }}</span>
    </button>
    <slot />
  </div>
</template>

<style scoped>
.swatch-grid {
  display: grid;
  grid-template-columns: repeat(var(--swatch-columns), minmax(0, 1fr));
  gap: 8px;
}
.swatch {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 8px 4px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 8px;
  font-size: 12px;
  cursor: pointer;
}
.swatch:hover {
  background: rgba(var(--v-theme-on-surface), 0.04);
}
.swatch:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 2px;
}
.swatch--selected {
  border-color: rgb(var(--v-theme-primary));
  box-shadow: 0 0 0 1px rgb(var(--v-theme-primary));
}
.swatch__dots {
  display: flex;
  gap: 4px;
}
.swatch__dot {
  width: 16px;
  height: 16px;
  border: 1px solid rgba(var(--v-border-color), 0.3);
  border-radius: 50%;
}
.swatch__label {
  overflow: hidden;
  max-width: 100%;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
