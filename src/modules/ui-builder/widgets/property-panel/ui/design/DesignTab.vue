<script setup lang="ts">
import { GRID_COLUMN_TYPE, type UiNode } from '../../../../entities/ui-node'
import BreakpointNotice from './BreakpointNotice.vue'
import GridSection from './GridSection.vue'
import AppearanceSection from './AppearanceSection.vue'
import LayoutSection from './LayoutSection.vue'
import RadiusSection from './RadiusSection.vue'
import SizeSection from './SizeSection.vue'
import SpacingSection from './SpacingSection.vue'

/**
 * Figma-style controls for the look of an element: size, layout and alignment, spacing, corner radius, fill and stroke.
 * They write to the element's inline style, next to the class-based settings of the other tabs, which stay as they are.
 */
defineProps<{ node: UiNode }>()
</script>

<template>
  <div class="design-tab">
    <BreakpointNotice :node="node" />
    <GridSection v-if="node.type === GRID_COLUMN_TYPE" :node="node" />
    <SizeSection :node="node" />
    <LayoutSection :node="node" />
    <SpacingSection :node="node" />
    <RadiusSection :node="node" />
    <AppearanceSection :node="node" />
    <p class="design-tab__note">
      These settings are saved as the element's own style and take priority over the classes set in the other tabs.
    </p>
  </div>
</template>

<style scoped>
.design-tab__note {
  margin: 12px 0 0;
  font-size: 12px;
  opacity: 0.6;
}
</style>
