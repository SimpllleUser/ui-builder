<script setup lang="ts">
import { ref } from 'vue'
import { inputValue } from '../../../../../../shared/lib/dom'

/**
 * A small number input with a short label, like those in Figma. Dragging the label left or right changes the value
 * (hold Shift to move by ten). Leaving the field empty means “not set”.
 */
const props = withDefaults(
  defineProps<{
    modelValue: number | null
    label: string
    title?: string
    min?: number
    max?: number
    step?: number
    placeholder?: string
  }>(),
  { step: 1 },
)
const emit = defineEmits<{ 'update:modelValue': [value: number | null] }>()

const SCRUB_PIXELS_PER_STEP = 3
const FAST_FACTOR = 10

const clamp = (value: number) => Math.min(props.max ?? Infinity, Math.max(props.min ?? -Infinity, value))

const onInput = (event: Event) => {
  const text = inputValue(event)
  emit('update:modelValue', text === '' ? null : clamp(Number(text)))
}

const scrubbing = ref(false)
const startScrub = (event: PointerEvent) => {
  event.preventDefault()
  const origin = { x: event.clientX, value: props.modelValue ?? 0 }
  scrubbing.value = true
  const move = (e: PointerEvent) => {
    const steps = Math.round((e.clientX - origin.x) / SCRUB_PIXELS_PER_STEP)
    emit('update:modelValue', clamp(origin.value + steps * props.step * (e.shiftKey ? FAST_FACTOR : 1)))
  }
  const stop = () => {
    scrubbing.value = false
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', stop)
    window.removeEventListener('pointercancel', stop)
  }
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', stop)
  window.addEventListener('pointercancel', stop)
}
</script>

<template>
  <label class="number-field" :title="title">
    <span
      class="number-field__label"
      :class="{ 'number-field__label--active': scrubbing }"
      aria-hidden="true"
      @pointerdown="startScrub"
      >{{ label }}</span
    >
    <input
      class="number-field__input"
      type="number"
      :value="modelValue ?? ''"
      :min="min"
      :max="max"
      :step="step"
      :placeholder="placeholder"
      :aria-label="title ?? label"
      @input="onInput"
    />
  </label>
</template>

<style scoped>
.number-field {
  display: flex;
  min-width: 0;
  align-items: center;
  height: 30px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: rgba(var(--v-theme-on-surface), 0.06);
}
.number-field:hover {
  border-color: rgba(var(--v-border-color), 0.3);
}
.number-field:focus-within {
  border-color: rgb(var(--v-theme-primary));
  background: rgb(var(--v-theme-surface));
}
.number-field__label {
  width: 22px;
  flex-shrink: 0;
  text-align: center;
  font-size: 11px;
  opacity: 0.6;
  cursor: ew-resize;
  user-select: none;
}
.number-field__label--active {
  color: rgb(var(--v-theme-primary));
  opacity: 1;
}
.number-field__input {
  width: 100%;
  min-width: 0;
  padding-right: 6px;
  font-size: 12px;
  outline: none;
  background: transparent;
  color: inherit;
  appearance: textfield;
}
.number-field__input::-webkit-inner-spin-button,
.number-field__input::-webkit-outer-spin-button {
  appearance: none;
}
</style>
