<script setup lang="ts">
import { computed } from 'vue'
import { PAGE_SCOPE_CLASS } from '../model/pageScope'
import { buildVuetifyDefaults } from '../model/vuetifyDefaults'
import { useProjectThemeVariant } from '../model/useProjectThemeVariant'
import { useThemeSettings } from '../model/useThemeSettings'

/**
 * Gives what is inside the project's colours and component defaults (density, card and button style) and marks it
 * as the page, so the theme's rules reach it. The editor stays outside, so a project's theme does not restyle it.
 */
const { settings } = useThemeSettings()
const { themeName } = useProjectThemeVariant()
const defaults = computed(() => buildVuetifyDefaults(settings.value))
</script>

<template>
  <VDefaultsProvider :defaults="defaults">
    <VThemeProvider :theme="themeName">
      <div :class="[PAGE_SCOPE_CLASS, `v-theme--${themeName}`]"><slot /></div>
    </VThemeProvider>
  </VDefaultsProvider>
</template>

<style scoped>
/* The wrapper only passes styles on; it must not change the layout of the page inside. */
.ui-page-style {
  display: contents;
  color: rgb(var(--v-theme-on-background));
}
</style>
