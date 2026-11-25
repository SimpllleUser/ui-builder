<script setup lang="ts">
import { computed } from 'vue'
import { PAGE_SCOPE_CLASS } from '../model/pageScope'
import { buildVuetifyDefaults } from '../model/vuetifyDefaults'
import { useThemeSettings } from '../model/useThemeSettings'

/**
 * Gives what is inside the theme's component defaults (density, card and button style) and marks it as the page,
 * so type and spacing rules reach it. The editor's own panels stay outside, so a theme does not restyle the editor.
 */
const { settings } = useThemeSettings()
const defaults = computed(() => buildVuetifyDefaults(settings.value))
</script>

<template>
  <VDefaultsProvider :defaults="defaults">
    <div :class="PAGE_SCOPE_CLASS"><slot /></div>
  </VDefaultsProvider>
</template>

<style scoped>
/* The wrapper only passes styles on; it must not change the layout of the page inside. */
.ui-page-style {
  display: contents;
}
</style>
