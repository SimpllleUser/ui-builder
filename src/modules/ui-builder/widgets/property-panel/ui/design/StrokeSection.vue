<script setup lang="ts">
import { computed, ref } from 'vue'
import { CssValue, Side, sideWidthProperty, sideStrokePatch, strokePatch } from '../../model/designStyle'
import { parsePx, toPx } from '../../../../../../shared/lib/inlineStyle'
import { useNodeStyle } from '../../model/useNodeStyle'
import { type UiNode } from '../../../../entities/ui-node'
import ColorField from './ColorField.vue'
import DesignSection from './DesignSection.vue'
import IconToggle from './IconToggle.vue'
import NumberField from './NumberField.vue'
import './designGrid.css'

const SIDES = [
  { side: Side.Top, label: 'T' },
  { side: Side.Bottom, label: 'B' },
  { side: Side.Left, label: 'L' },
  { side: Side.Right, label: 'R' },
]

/** The border: its colour, and one width for all sides or a width for each. */
const props = defineProps<{ node: UiNode }>()
const { style, apply } = useNodeStyle(() => props.node)

const hasSideValues = computed(() => SIDES.some(({ side }) => style.value[sideWidthProperty(side)]))
const perSide = ref(hasSideValues.value)
const width = computed(() => parsePx(style.value.borderWidth))
const sideWidth = (side: Side) => parsePx(style.value[sideWidthProperty(side)]) ?? width.value
</script>

<template>
  <DesignSection title="Stroke">
    <ColorField
      label="Colour"
      :model-value="style.borderColor"
      @update:model-value="color => apply(strokePatch(style, color))"
    />
    <div class="stroke-row">
      <NumberField
        label="W"
        title="Stroke width"
        :model-value="width"
        :min="0"
        placeholder="0"
        @update:model-value="value => apply({ borderWidth: toPx(value), borderStyle: value ? CssValue.Solid : null })"
      />
      <IconToggle
        icon="mdi-border-outside"
        label="Set each side separately"
        :pressed="perSide"
        @click="perSide = !perSide"
      />
    </div>
    <div v-if="perSide" class="design-grid">
      <NumberField
        v-for="item in SIDES"
        :key="item.side"
        :label="item.label"
        :title="`Stroke ${item.side.toLowerCase()}`"
        :model-value="sideWidth(item.side)"
        :min="0"
        placeholder="0"
        @update:model-value="value => apply(sideStrokePatch(style, item.side, value))"
      />
    </div>
  </DesignSection>
</template>

<style scoped>
.stroke-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
  align-items: center;
}
</style>
