<script setup lang="ts">
import { ref } from 'vue'
import { readSpacing, SpacingType, type UiNode } from '../../../../entities/ui-node'
import { Side, SpacingBox, spacingProperty } from '../../model/designStyle'
import { parsePx, toPx } from '../../../../../../shared/lib/inlineStyle'
import { useNodeStyle } from '../../model/useNodeStyle'
import DesignSection from './DesignSection.vue'
import IconToggle from './IconToggle.vue'
import NumberField from './NumberField.vue'

// Listed as they sit in the 2 × 2 grid: top and bottom, then left and right.
const SIDES = [
  { side: Side.Top, label: 'T', letter: 't' },
  { side: Side.Bottom, label: 'B', letter: 'b' },
  { side: Side.Left, label: 'L', letter: 'l' },
  { side: Side.Right, label: 'R', letter: 'r' },
]
const BOXES = [
  { box: SpacingBox.Margin, name: 'Margin', type: SpacingType.Margin, min: undefined },
  { box: SpacingBox.Padding, name: 'Padding', type: SpacingType.Padding, min: 0 },
]
const SPACING_UNIT_PX = 4

/** Margin (outside the element) and padding (inside it), with a field for each side. */
const props = defineProps<{ node: UiNode }>()
const { style, apply } = useNodeStyle(() => props.node)

const value = (box: SpacingBox, side: Side) => parsePx(style.value[spacingProperty(box, side)])
const allEqual = (box: SpacingBox) => {
  const values = SIDES.map(({ side }) => value(box, side))
  return values[0] !== null && values.every(item => item === values[0])
}

// While linked, a change to one side is written to all four.
const linked = ref(new Set<SpacingBox>(BOXES.map(item => item.box).filter(allEqual)))
const toggleLink = (box: SpacingBox) => {
  const next = new Set(linked.value)
  if (!next.delete(box)) next.add(box)
  linked.value = next
}
const setSide = (box: SpacingBox, side: Side, amount: number | null) => {
  const sides = linked.value.has(box) ? SIDES.map(item => item.side) : [side]
  apply(Object.fromEntries(sides.map(item => [spacingProperty(box, item), toPx(amount)])))
}

// A side set by a class (`pa-4`) is shown faintly, so the fields never look empty when the element does have spacing.
const fromClasses = (type: SpacingType, letter: string) => {
  const units = readSpacing(props.node.classes, type, letter)
  return typeof units === 'number' ? String(units * SPACING_UNIT_PX) : '0'
}
</script>

<template>
  <DesignSection title="Spacing">
    <div v-for="group in BOXES" :key="group.box" class="spacing-group">
      <div class="spacing-group__head">
        <span>{{ group.name }}</span>
        <IconToggle
          icon="mdi-link-variant"
          compact
          :label="`Same ${group.name.toLowerCase()} on all sides`"
          :pressed="linked.has(group.box)"
          @click="toggleLink(group.box)"
        />
      </div>
      <div class="spacing-group__fields">
        <NumberField
          v-for="item in SIDES"
          :key="item.side"
          :label="item.label"
          :title="`${group.name} ${item.side.toLowerCase()}`"
          :model-value="value(group.box, item.side)"
          :min="group.min"
          :placeholder="fromClasses(group.type, item.letter)"
          @update:model-value="amount => setSide(group.box, item.side, amount)"
        />
      </div>
    </div>
  </DesignSection>
</template>

<style scoped>
.spacing-group + .spacing-group {
  margin-top: 10px;
}
.spacing-group__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
  font-size: 12px;
  opacity: 0.8;
}
.spacing-group__fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}
</style>
