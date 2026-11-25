<script setup lang="ts">
import { BREAKPOINT_MIN_WIDTHS, BREAKPOINTS, Breakpoint, useUiTreeStore } from '../../../entities/ui-node'

/** Chooses which of Vuetify's screen sizes is edited; none edits all sizes. */
const store = useUiTreeStore()

const title = (breakpoint: Breakpoint) =>
  breakpoint === Breakpoint.Xs
    ? 'XS: phones. These are the base settings, used by every size that does not change them'
    : `${breakpoint.toUpperCase()}: from ${BREAKPOINT_MIN_WIDTHS[breakpoint]}px up`
</script>

<template>
  <div class="breakpoint-switcher" role="group" aria-label="Screen size to edit">
    <button
      type="button"
      :aria-pressed="store.editingBreakpoint === null"
      title="Edit all sizes; the canvas fills the window"
      @click="store.editingBreakpoint = null"
    >
      All
    </button>
    <button
      v-for="breakpoint in BREAKPOINTS"
      :key="breakpoint"
      type="button"
      :aria-pressed="store.editingBreakpoint === breakpoint"
      :title="title(breakpoint)"
      @click="store.editingBreakpoint = breakpoint"
    >
      {{ breakpoint.toUpperCase() }}
    </button>
  </div>
</template>

<style scoped>
.breakpoint-switcher {
  display: flex;
  gap: 2px;
  padding: 2px;
  border-radius: 8px;
  background: rgba(var(--v-theme-on-surface), 0.06);
}
.breakpoint-switcher button {
  min-width: 32px;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
}
.breakpoint-switcher button[aria-pressed='true'] {
  background: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-on-primary));
}
</style>
