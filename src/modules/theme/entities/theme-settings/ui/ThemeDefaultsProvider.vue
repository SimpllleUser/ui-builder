<script setup lang="ts">
import { computed } from 'vue'
import { buildVuetifyDefaults } from '../model/vuetifyDefaults'
import { useThemeSettings } from '../model/useThemeSettings'

/**
 * Gives what is inside the theme's component defaults (density, card and button style).
 * The editor's own panels stay outside it, so a compact theme does not squeeze the editor itself.
 */
const { settings } = useThemeSettings()
const defaults = computed(() => buildVuetifyDefaults(settings.value))
</script>

<template>
  <VDefaultsProvider :defaults="defaults"><slot /></VDefaultsProvider>
</template>
