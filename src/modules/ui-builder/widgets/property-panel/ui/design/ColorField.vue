<script setup lang="ts">
import { computed } from 'vue'
import { useTheme } from 'vuetify'
import { inputValue } from '../../../../../../shared/lib/dom'
import { THEME_COLORS, ThemeColor, parseThemeColor, themeColorValue } from '../../../../../../shared/lib/themeColors'

const DEFAULT_COLOR = '#000000'
const HEX_COLOR = /^#[0-9a-f]{6}$/i

/**
 * Picks a colour: one of the theme's colours (kept as theme variables, so they follow light and dark mode),
 * or any custom colour from the colour picker or typed as text. Picking the chosen theme colour again clears it.
 */
const props = defineProps<{ modelValue: string | undefined; label: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string | null] }>()

const theme = useTheme()
const shown = (color: ThemeColor) => theme.current.value.colors[color] ?? DEFAULT_COLOR
const selected = computed(() => parseThemeColor(props.modelValue))
const pickerValue = computed(() =>
  props.modelValue && HEX_COLOR.test(props.modelValue) ? props.modelValue : DEFAULT_COLOR,
)

const choose = (color: ThemeColor) =>
  emit('update:modelValue', selected.value === color ? null : themeColorValue(color))
const typed = (event: Event) => emit('update:modelValue', inputValue(event).trim() || null)
const picked = (event: Event) => emit('update:modelValue', inputValue(event))
</script>

<template>
  <div class="color-field">
    <div class="color-field__head">
      <span class="color-field__name">{{ label }}</span>
      <input
        class="color-field__custom"
        type="color"
        :aria-label="`${label}: custom colour`"
        :value="pickerValue"
        @input="picked"
      />
      <input
        class="color-field__text"
        type="text"
        placeholder="none"
        :aria-label="`${label} value`"
        :value="modelValue ?? ''"
        @change="typed"
      />
      <button
        v-if="modelValue"
        type="button"
        class="color-field__clear"
        :title="`Remove ${label.toLowerCase()}`"
        :aria-label="`Remove ${label.toLowerCase()}`"
        @click="emit('update:modelValue', null)"
      >
        <VIcon icon="mdi-close" size="14" aria-hidden="true" />
      </button>
    </div>
    <div class="color-field__presets" role="group" :aria-label="`${label}: theme colours`">
      <button
        v-for="color in THEME_COLORS"
        :key="color"
        type="button"
        class="color-field__preset"
        :class="{ 'color-field__preset--on': selected === color }"
        :style="{ background: shown(color) }"
        :title="`Theme colour: ${color}`"
        :aria-label="`${label}: ${color}`"
        :aria-pressed="selected === color"
        @click="choose(color)"
      />
    </div>
  </div>
</template>

<style scoped>
.color-field {
  margin-bottom: 10px;
}
.color-field__head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.color-field__name {
  width: 52px;
  flex-shrink: 0;
  font-size: 12px;
  opacity: 0.7;
}
.color-field__custom {
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  padding: 0;
  border: 1px solid rgba(var(--v-border-color), 0.3);
  border-radius: 6px;
  background: none;
}
.color-field__text {
  min-width: 0;
  flex: 1;
  height: 30px;
  padding: 0 8px;
  border-radius: 6px;
  background: rgba(var(--v-theme-on-surface), 0.06);
  font-size: 12px;
}
.color-field__clear {
  display: grid;
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  place-items: center;
  border-radius: 4px;
  opacity: 0.6;
}
.color-field__clear:hover {
  background: rgba(var(--v-theme-on-surface), 0.08);
}
.color-field__presets {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin: 6px 0 0 60px;
}
.color-field__preset {
  width: 18px;
  height: 18px;
  border: 1px solid rgba(var(--v-border-color), 0.4);
  border-radius: 50%;
}
.color-field__preset:hover {
  transform: scale(1.15);
}
.color-field__preset--on {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 2px;
}
</style>
