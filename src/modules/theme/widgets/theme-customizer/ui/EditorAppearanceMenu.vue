<script setup lang="ts">
import { useEditorAppearance } from '../../../entities/theme-settings'
import { COLOR_PRESET_OPTIONS, MODE_OPTIONS, SURFACE_PRESET_OPTIONS } from '../model/options'
import OptionToggle from './OptionToggle.vue'
import SettingSection from './SettingSection.vue'
import SwatchGrid from './SwatchGrid.vue'

/** How the editor itself looks. The theme of the page being built is a separate setting of the project. */
const { appearance, resetAppearance } = useEditorAppearance()
</script>

<template>
  <VMenu location="bottom end" :close-on-content-click="false">
    <template #activator="{ props: menu }">
      <VBtn
        v-bind="menu"
        icon="mdi-theme-light-dark"
        size="small"
        variant="text"
        title="Editor appearance"
        aria-label="Editor appearance"
      />
    </template>
    <VCard width="360" max-height="70vh" class="pa-4 d-flex flex-column ga-4" aria-label="Editor appearance">
      <div class="d-flex align-center">
        <span class="text-subtitle-1">Editor appearance</span>
        <VSpacer />
        <VBtn size="small" variant="text" prepend-icon="mdi-restore" @click="resetAppearance">Reset</VBtn>
      </div>
      <SettingSection title="Mode">
        <OptionToggle v-model="appearance.mode" :options="MODE_OPTIONS" label="Editor mode" />
      </SettingSection>
      <SettingSection title="Accent colour">
        <SwatchGrid v-model="appearance.colorPreset" :options="COLOR_PRESET_OPTIONS" label="Editor accent colour" />
      </SettingSection>
      <SettingSection title="Background and surfaces">
        <SwatchGrid v-model="appearance.surfacePreset" :options="SURFACE_PRESET_OPTIONS" label="Editor surfaces" />
      </SettingSection>
    </VCard>
  </VMenu>
</template>
