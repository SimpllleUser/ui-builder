<script setup lang="ts">
import { computed } from 'vue'
import {
  DESIGN_PRESETS,
  DesignPreset,
  ThemeVariant,
  applyDesignPreset,
  matchingDesignPreset,
  resolveFonts,
  resolveThemeColors,
  type ThemeSettings,
} from '../../../entities/theme-settings'
import { DESIGN_PRESET_LABELS } from '../model/options'

/** Each preset as a small sample of itself: its heading font, background, corners and main colour. */
const settings = defineModel<ThemeSettings>({ required: true })
const selected = computed(() => matchingDesignPreset(settings.value))

const tiles = computed(() =>
  Object.values(DesignPreset).map(preset => {
    const look = DESIGN_PRESETS[preset]
    const colors = resolveThemeColors(applyDesignPreset(settings.value, preset), ThemeVariant.Light)
    const { heading } = resolveFonts(look)
    return {
      preset,
      ...DESIGN_PRESET_LABELS[preset],
      style: {
        '--preset-background': colors.background,
        '--preset-text': colors['on-surface'],
        '--preset-primary': colors.primary,
        '--preset-radius': `${look.radius ?? 4}px`,
        '--preset-font': heading?.stack ?? 'Roboto, Arial, sans-serif',
        '--preset-weight': heading ? 700 : 400,
      },
    }
  }),
)

const select = (preset: DesignPreset) => {
  settings.value = applyDesignPreset(settings.value, preset)
}
</script>

<template>
  <div class="preset-grid" role="radiogroup" aria-label="Style presets">
    <button
      v-for="tile in tiles"
      :key="tile.preset"
      type="button"
      role="radio"
      class="preset"
      :class="{ 'preset--selected': tile.preset === selected }"
      :aria-checked="tile.preset === selected"
      @click="select(tile.preset)"
    >
      <span class="preset__sample" :style="tile.style" aria-hidden="true">
        <span class="preset__heading">Аа Bb</span>
        <span class="preset__button" />
      </span>
      <span class="preset__label">{{ tile.label }}</span>
      <span class="preset__description">{{ tile.description }}</span>
    </button>
  </div>
</template>

<style scoped>
.preset-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(168px, 1fr));
  gap: 12px;
}
.preset {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 6px 6px 10px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 10px;
  text-align: left;
  cursor: pointer;
}
.preset:hover {
  background: rgba(var(--v-theme-on-surface), 0.04);
}
.preset--selected {
  border-color: rgb(var(--v-theme-primary));
  box-shadow: 0 0 0 1px rgb(var(--v-theme-primary));
}
.preset__sample {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
  margin-bottom: 6px;
  padding: 0 14px;
  border: 1px solid rgba(var(--v-border-color), 0.12);
  border-radius: 6px;
  background: var(--preset-background);
  color: var(--preset-text);
}
.preset__heading {
  font-family: var(--preset-font);
  font-weight: var(--preset-weight);
  font-size: 24px;
}
.preset__button {
  width: 44px;
  height: 22px;
  border-radius: var(--preset-radius);
  background: var(--preset-primary);
}
.preset__label {
  padding: 0 6px;
  font-size: 13px;
  font-weight: 600;
}
.preset__description {
  padding: 0 6px;
  font-size: 12px;
  opacity: 0.7;
}
</style>
