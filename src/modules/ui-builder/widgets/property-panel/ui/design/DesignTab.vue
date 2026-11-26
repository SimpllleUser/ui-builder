<script setup lang="ts">
import { GRID_COLUMN_TYPE, type UiNode } from '../../../../entities/ui-node'
import BreakpointNotice from './BreakpointNotice.vue'
import GridSection from './GridSection.vue'
import AppearanceSection from './AppearanceSection.vue'
import LayoutSection from './LayoutSection.vue'
import RadiusSection from './RadiusSection.vue'
import ShadowSection from './ShadowSection.vue'
import StrokeSection from './StrokeSection.vue'
import SizeSection from './SizeSection.vue'
import SpacingSection from './SpacingSection.vue'
import StyleClassSection from './StyleClassSection.vue'
import TypographySection from './TypographySection.vue'

/**
 * Figma-style controls for the look of an element: size, layout and alignment, spacing, corner radius, fill and stroke.
 * They write to the element's inline style (or, through the style classes, to a shared rule), next to the class-based settings of the other tabs, which stay as they are.
 */
defineProps<{ node: UiNode }>()
</script>

<template>
  <div class="design-tab">
    <BreakpointNotice :node="node" />
    <StyleClassSection :node="node" />
    <GridSection v-if="node.type === GRID_COLUMN_TYPE" :node="node" />
    <SizeSection :node="node" />
    <LayoutSection :node="node" />
    <SpacingSection :node="node" />
    <RadiusSection :node="node" />
    <TypographySection :node="node" />
    <AppearanceSection :node="node" />
    <StrokeSection :node="node" />
    <ShadowSection :node="node" />
    <p class="design-tab__note">
      These settings are saved as the element's own style. It wins over style classes, and both win over Vuetify's
      classes and component options (all values are <code>!important</code>).
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
