<script setup lang="ts">
import { computed } from 'vue'
import {
  Axis,
  CssValue,
  Position,
  TextAlign,
  alignmentStyle,
  isFlex,
  readAlignment,
  readAxis,
} from '../../model/designStyle'
import { parsePx, toPx } from '../../../../../../shared/lib/inlineStyle'
import { parseSpaceToken, SpaceToken, spaceValue } from '../../../../../../shared/lib/themeTokens'
import { useNodeStyle } from '../../model/useNodeStyle'
import { type UiNode } from '../../../../entities/ui-node'
import DesignSection from './DesignSection.vue'
import IconToggle from './IconToggle.vue'
import IconToggleGroup from './IconToggleGroup.vue'
import NumberField from './NumberField.vue'
import TokenChips from './TokenChips.vue'

const SPACE_TOKENS = Object.values(SpaceToken)
const GRID: Position[] = [Position.Start, Position.Center, Position.End]
const DIRECTIONS = [
  { axis: Axis.Row, icon: 'mdi-arrow-right', title: 'Children in a row' },
  { axis: Axis.Column, icon: 'mdi-arrow-down', title: 'Children in a column' },
]
const TEXT_ALIGNMENTS = [
  { align: TextAlign.Left, icon: 'mdi-format-align-left' },
  { align: TextAlign.Center, icon: 'mdi-format-align-center' },
  { align: TextAlign.Right, icon: 'mdi-format-align-right' },
  { align: TextAlign.Justify, icon: 'mdi-format-align-justify' },
]

/** How the children are laid out (a row or a column), where they sit in the box, and the gap between them. */
const props = defineProps<{ node: UiNode }>()
const { style, apply } = useNodeStyle(() => props.node)

const flex = computed(() => isFlex(style.value))
const axis = computed(() => readAxis(style.value))
const alignment = computed(() => readAlignment(style.value))
const wraps = computed(() => style.value.flexWrap === 'wrap')

const gapToken = computed(() => parseSpaceToken(style.value.gap))

const turnOn = () => apply({ display: CssValue.Flex })
const turnOff = () => {
  apply({ display: null, flexDirection: null, justifyContent: null, alignItems: null, gap: null, flexWrap: null })
  // On a smaller screen the layout may still be inherited from a larger one, which only an override can end.
  if (flex.value) apply({ display: CssValue.Block })
}
const setAxis = (next: Axis) => {
  // Keep the same corner of the box when the direction flips.
  const current = alignment.value
  apply({ flexDirection: next === Axis.Row ? null : next, ...(current ? alignmentStyle(next, current) : {}) })
}
const place = (horizontal: Position, vertical: Position) => apply(alignmentStyle(axis.value, { horizontal, vertical }))
</script>

<template>
  <DesignSection title="Layout">
    <template v-if="!flex">
      <div class="layout-off">
        <p class="layout-hint">Children stack normally. Turn on auto layout to align them and set a gap.</p>
        <VBtn
          size="small"
          variant="tonal"
          prepend-icon="mdi-view-sequential-outline"
          class="layout-off__button"
          @click="turnOn"
          >Auto layout</VBtn
        >
      </div>
    </template>
    <template v-else>
      <div class="layout-row">
        <div class="layout-grid" role="group" aria-label="Alignment of the children">
          <template v-for="vertical in GRID" :key="vertical">
            <button
              v-for="horizontal in GRID"
              :key="`${vertical}-${horizontal}`"
              type="button"
              class="layout-cell"
              :class="{ 'layout-cell--on': alignment?.horizontal === horizontal && alignment?.vertical === vertical }"
              :aria-label="`Align ${vertical} ${horizontal}`"
              :aria-pressed="alignment?.horizontal === horizontal && alignment?.vertical === vertical"
              @click="place(horizontal, vertical)"
            />
          </template>
        </div>
        <div class="layout-controls">
          <IconToggleGroup label="Direction">
            <IconToggle
              v-for="direction in DIRECTIONS"
              :key="direction.axis"
              :icon="direction.icon"
              :label="direction.title"
              :pressed="axis === direction.axis"
              @click="setAxis(direction.axis)"
            />
            <IconToggle
              icon="mdi-wrap"
              label="Wrap to the next line"
              :pressed="wraps"
              @click="apply({ flexWrap: wraps ? null : CssValue.Wrap })"
            />
          </IconToggleGroup>
          <NumberField
            label="⇔"
            title="Gap between children"
            :model-value="parsePx(style.gap)"
            :min="0"
            :placeholder="gapToken ?? '0'"
            @update:model-value="value => apply({ gap: toPx(value) })"
          />
        </div>
      </div>
      <TokenChips
        label="Gap"
        :tokens="SPACE_TOKENS"
        :selected="gapToken"
        @pick="token => apply({ gap: token && spaceValue(token) })"
      />
      <VBtn size="x-small" variant="text" class="mt-2" @click="turnOff">Turn off auto layout</VBtn>
    </template>

    <IconToggleGroup label="Text alignment" class="layout-text">
      <IconToggle
        v-for="option in TEXT_ALIGNMENTS"
        :key="option.align"
        :icon="option.icon"
        :label="`Align text ${option.align}`"
        :pressed="style.textAlign === option.align"
        @click="apply({ textAlign: style.textAlign === option.align ? null : option.align })"
      />
    </IconToggleGroup>
  </DesignSection>
</template>

<style scoped>
.layout-off {
  display: flex;
  align-items: center;
  gap: 12px;
}
.layout-off__button {
  flex-shrink: 0;
}
.layout-hint {
  min-width: 0;
  flex: 1;
  margin: 0;
  font-size: 12px;
  opacity: 0.7;
}
.layout-row {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}
.layout-grid {
  display: grid;
  grid-template-columns: repeat(3, 22px);
  grid-auto-rows: 22px;
  gap: 2px;
  padding: 4px;
  border-radius: 6px;
  background: rgba(var(--v-theme-on-surface), 0.06);
}
.layout-cell {
  position: relative;
  border-radius: 4px;
}
.layout-cell::after {
  position: absolute;
  inset: 8px;
  border-radius: 50%;
  background: rgba(var(--v-theme-on-surface), 0.3);
  content: '';
}
.layout-cell:hover::after {
  background: rgb(var(--v-theme-primary));
}
.layout-cell--on::after {
  inset: 5px;
  border-radius: 3px;
  background: rgb(var(--v-theme-primary));
}
.layout-controls {
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
  gap: 8px;
}
.layout-text {
  margin-top: 12px;
}
</style>
