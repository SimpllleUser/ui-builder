<script setup lang="ts">
import { computed } from 'vue'
import { parseTextToken, TextToken, textStylePatch } from '../../../../../../shared/lib/themeTokens'
import { parsePx, toPx } from '../../../../../../shared/lib/inlineStyle'
import { useNodeStyle } from '../../model/useNodeStyle'
import { type UiNode } from '../../../../entities/ui-node'
import DesignSection from './DesignSection.vue'
import NumberField from './NumberField.vue'
import TokenChips from './TokenChips.vue'
import './designGrid.css'

const TEXT_TOKENS = Object.values(TextToken)

/**
 * One of the theme's text styles (size, line height, weight, letter spacing and font together), or a size and a
 * weight of its own. Like every design setting, they apply from the screen size being edited up.
 */
const props = defineProps<{ node: UiNode }>()
const { style, apply } = useNodeStyle(() => props.node)
const selected = computed(() => parseTextToken(style.value.fontSize))
const weight = computed(() => (Number(style.value.fontWeight) ? Number(style.value.fontWeight) : null))
const setWeight = (value: number | null) => apply({ fontWeight: value === null ? null : String(value) })
</script>

<template>
  <DesignSection title="Typography">
    <TokenChips
      label="Text style"
      :tokens="TEXT_TOKENS"
      :selected="selected"
      @pick="token => apply(textStylePatch(token))"
    />
    <div class="design-grid">
      <NumberField
        label="S"
        title="Font size"
        :model-value="parsePx(style.fontSize)"
        :min="1"
        :placeholder="selected ?? 'size'"
        @update:model-value="value => apply({ fontSize: toPx(value) })"
      />
      <NumberField
        label="B"
        title="Font weight"
        :model-value="weight"
        :min="100"
        :max="900"
        :step="100"
        placeholder="weight"
        @update:model-value="setWeight"
      />
    </div>
  </DesignSection>
</template>
