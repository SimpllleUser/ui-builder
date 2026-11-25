<script setup lang="ts">
import { computed } from 'vue'
import { parseTextToken, TextToken, textStylePatch } from '../../../../../../shared/lib/themeTokens'
import { useNodeStyle } from '../../model/useNodeStyle'
import { type UiNode } from '../../../../entities/ui-node'
import DesignSection from './DesignSection.vue'
import TokenChips from './TokenChips.vue'

const TEXT_TOKENS = Object.values(TextToken)

/** One of the theme's text styles: size, line height, weight, letter spacing and font together. */
const props = defineProps<{ node: UiNode }>()
const { style, apply } = useNodeStyle(() => props.node)
const selected = computed(() => parseTextToken(style.value.fontSize))
</script>

<template>
  <DesignSection title="Typography">
    <TokenChips
      label="Text style"
      :tokens="TEXT_TOKENS"
      :selected="selected"
      @pick="token => apply(textStylePatch(token))"
    />
  </DesignSection>
</template>
