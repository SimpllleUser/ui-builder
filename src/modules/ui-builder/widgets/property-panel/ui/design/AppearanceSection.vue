<script setup lang="ts">
import { CssValue, DEFAULT_STROKE_WIDTH } from '../../model/designStyle'
import { parsePx, toPx } from '../../../../../../shared/lib/inlineStyle'
import { inputValue } from '../../../../../../shared/lib/dom'
import { useNodeStyle } from '../../model/useNodeStyle'
import { type UiNode } from '../../../../entities/ui-node'
import ColorField from './ColorField.vue'
import DesignSection from './DesignSection.vue'
import NumberField from './NumberField.vue'

const PERCENT = 100

/** Fill, text colour, stroke (border) and opacity. Colours can come from the theme or be custom. */
const props = defineProps<{ node: UiNode }>()
const { style, apply } = useNodeStyle(() => props.node)

const opacityPercent = () =>
  style.value.opacity === undefined ? PERCENT : Math.round(Number(style.value.opacity) * PERCENT)
const setOpacity = (percent: number | null) =>
  apply({ opacity: percent === null || percent >= PERCENT ? null : String(percent / PERCENT) })
// A colour alone draws nothing without a width, so choosing one starts a 1px line.
const setStrokeColor = (color: string | null) =>
  apply(
    color === null
      ? { borderColor: null, borderWidth: null, borderStyle: null }
      : {
          borderColor: color,
          borderStyle: style.value.borderStyle ?? CssValue.Solid,
          borderWidth: style.value.borderWidth ?? DEFAULT_STROKE_WIDTH,
        },
  )
const setStrokeWidth = (width: number | null) =>
  apply({ borderWidth: toPx(width), borderStyle: width ? (style.value.borderStyle ?? CssValue.Solid) : null })
</script>

<template>
  <DesignSection title="Appearance">
    <ColorField
      label="Fill"
      :model-value="style.backgroundColor"
      @update:model-value="value => apply({ backgroundColor: value })"
    />
    <ColorField label="Text" :model-value="style.color" @update:model-value="value => apply({ color: value })" />
    <ColorField label="Stroke" :model-value="style.borderColor" @update:model-value="setStrokeColor" />
    <div class="appearance-row">
      <span class="appearance-row__name">Width</span>
      <NumberField
        label="W"
        title="Stroke width"
        :model-value="parsePx(style.borderWidth)"
        :min="0"
        placeholder="0"
        @update:model-value="setStrokeWidth"
      />
    </div>
    <div class="appearance-row">
      <span class="appearance-row__name">Opacity</span>
      <input
        class="appearance-slider"
        type="range"
        min="0"
        max="100"
        aria-label="Opacity"
        :value="opacityPercent()"
        @input="setOpacity(Number(inputValue($event)))"
      />
      <span class="appearance-percent">{{ opacityPercent() }}%</span>
    </div>
  </DesignSection>
</template>

<style scoped>
.appearance-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.appearance-row__name {
  width: 52px;
  flex-shrink: 0;
  font-size: 12px;
  opacity: 0.7;
}
.appearance-slider {
  min-width: 0;
  flex: 1;
  accent-color: rgb(var(--v-theme-primary));
}
.appearance-percent {
  width: 36px;
  text-align: right;
  font-size: 12px;
}
</style>
