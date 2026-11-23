<script setup lang="ts">
import { toPx, parsePx } from '../../../../../../shared/lib/inlineStyle'
import { sizeMode, sizeValue, SizeMode } from '../../model/designStyle'
import { useNodeStyle } from '../../model/useNodeStyle'
import { type UiNode } from '../../../../entities/ui-node'
import DesignSection from './DesignSection.vue'
import IconToggle from './IconToggle.vue'
import IconToggleGroup from './IconToggleGroup.vue'
import NumberField from './NumberField.vue'

const DEFAULT_PIXELS = 100
const MODES = [
  { mode: SizeMode.Fixed, icon: 'mdi-pin-outline', title: 'Fixed size' },
  { mode: SizeMode.Fill, icon: 'mdi-arrow-expand-horizontal', title: 'Fill the available space (100%)' },
  { mode: SizeMode.Hug, icon: 'mdi-arrow-collapse-horizontal', title: 'Hug the content' },
]
const DIMENSIONS = [
  { property: 'width', label: 'W', name: 'Width' },
  { property: 'height', label: 'H', name: 'Height' },
]

/** Width and height: a number of pixels, filling the space, or fitting the content. */
const props = defineProps<{ node: UiNode }>()
const { style, apply } = useNodeStyle(() => props.node)
</script>

<template>
  <DesignSection title="Size">
    <div v-for="dimension in DIMENSIONS" :key="dimension.property" class="size-row">
      <NumberField
        :label="dimension.label"
        :title="dimension.name"
        :model-value="parsePx(style[dimension.property])"
        :min="0"
        placeholder="auto"
        @update:model-value="value => apply({ [dimension.property]: toPx(value) })"
      />
      <IconToggleGroup :label="`${dimension.name} mode`">
        <IconToggle
          v-for="option in MODES"
          :key="option.mode"
          :icon="option.icon"
          :label="`${dimension.name}: ${option.title}`"
          :title="option.title"
          :pressed="sizeMode(style[dimension.property]) === option.mode"
          @click="apply({ [dimension.property]: sizeValue(option.mode, style[dimension.property], DEFAULT_PIXELS) })"
        />
      </IconToggleGroup>
    </div>
  </DesignSection>
</template>

<style scoped>
.size-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
  align-items: center;
  margin-bottom: 6px;
}
</style>
