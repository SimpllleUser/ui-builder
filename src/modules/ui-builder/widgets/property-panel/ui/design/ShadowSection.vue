<script setup lang="ts">
import { computed } from 'vue'
import { parseShadow, ShadowLevel, shadowValue } from '../../model/designStyle'
import { useNodeStyle } from '../../model/useNodeStyle'
import { type UiNode } from '../../../../entities/ui-node'
import DesignSection from './DesignSection.vue'
import TokenChips from './TokenChips.vue'

const LEVELS = Object.values(ShadowLevel)

/** How far the element is lifted off the page. */
const props = defineProps<{ node: UiNode }>()
const { style, apply } = useNodeStyle(() => props.node)
const selected = computed(() => parseShadow(style.value.boxShadow))
</script>

<template>
  <DesignSection title="Shadow">
    <TokenChips
      label="Shadow"
      :tokens="LEVELS"
      :selected="selected"
      @pick="level => apply({ boxShadow: level && shadowValue(level) })"
    />
  </DesignSection>
</template>
