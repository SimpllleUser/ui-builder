<script setup lang="ts">
import { computed, ref } from 'vue'
import { ColorPreset, useThemeSettings } from '../../../entities/theme-settings'
import {
  CARD_STYLE_OPTIONS,
  COLOR_PRESET_OPTIONS,
  DENSITY_OPTIONS,
  FIELD_STYLE_OPTIONS,
  SPACING_OPTIONS,
  TYPOGRAPHY_OPTIONS,
  INTERACTIVE_STYLE_OPTIONS,
  MODE_OPTIONS,
  RADIUS_OPTIONS,
  SEMANTIC_PRESET_OPTIONS,
  SHADOW_PROFILE_OPTIONS,
  SURFACE_PRESET_OPTIONS,
} from '../model/options'
import DesignPresetGrid from './DesignPresetGrid.vue'
import ExtraColors from './ExtraColors.vue'
import FontSelect from './FontSelect.vue'
import OptionToggle from './OptionToggle.vue'
import SettingSection from './SettingSection.vue'
import SwatchGrid from './SwatchGrid.vue'
import ThemeExportPanel from './ThemeExportPanel.vue'

enum CustomizerTab {
  Appearance = 'appearance',
  Export = 'export',
}

const open = defineModel<boolean>({ required: true })
const { settings, resetSettings, isCustomized } = useThemeSettings()
const tab = ref(CustomizerTab.Appearance)
const colorOptions = computed(() => [
  ...COLOR_PRESET_OPTIONS,
  {
    value: ColorPreset.Custom,
    label: 'Custom',
    colors: [settings.value.customPrimary, settings.value.customSecondary],
  },
])
</script>

<template>
  <VDialog v-model="open" max-width="640" scrollable>
    <VCard aria-label="Project theme settings">
      <VCardTitle class="d-flex align-center theme-dialog__fixed">
        Project theme
        <VSpacer />
        <VBtn size="small" variant="text" prepend-icon="mdi-restore" :disabled="!isCustomized()" @click="resetSettings">
          Reset
        </VBtn>
        <VBtn icon="mdi-close" variant="text" size="small" aria-label="Close" @click="open = false" />
      </VCardTitle>
      <VTabs v-model="tab" class="theme-dialog__fixed">
        <VTab :value="CustomizerTab.Appearance" density="default">Appearance</VTab>
        <VTab :value="CustomizerTab.Export" density="default">Export</VTab>
      </VTabs>
      <VDivider />
      <VCardText>
        <VWindow v-model="tab">
          <VWindowItem :value="CustomizerTab.Appearance">
            <div class="d-flex flex-column ga-5">
              <SettingSection title="Style presets">
                <DesignPresetGrid v-model="settings" />
              </SettingSection>

              <SettingSection title="Mode">
                <OptionToggle v-model="settings.mode" :options="MODE_OPTIONS" label="Mode" />
              </SettingSection>

              <SettingSection title="Brand colours">
                <SwatchGrid v-model="settings.colorPreset" :options="colorOptions" label="Brand colours" />
                <div v-if="settings.colorPreset === ColorPreset.Custom" class="custom-colors">
                  <label> Primary <input v-model="settings.customPrimary" type="color" /> </label>
                  <label> Secondary <input v-model="settings.customSecondary" type="color" /> </label>
                </div>
              </SettingSection>

              <SettingSection title="Your own colours">
                <ExtraColors />
              </SettingSection>

              <SettingSection title="Status colours">
                <SwatchGrid
                  v-model="settings.semanticPreset"
                  :options="SEMANTIC_PRESET_OPTIONS"
                  label="Status colours"
                />
              </SettingSection>

              <SettingSection title="Background and surfaces">
                <SwatchGrid v-model="settings.surfacePreset" :options="SURFACE_PRESET_OPTIONS" label="Surfaces" />
              </SettingSection>

              <SettingSection title="Typography">
                <OptionToggle v-model="settings.typography" :options="TYPOGRAPHY_OPTIONS" label="Typography" />
              </SettingSection>

              <SettingSection title="Fonts">
                <div class="font-selects">
                  <FontSelect v-model="settings.headingFont" label="Headings" />
                  <FontSelect v-model="settings.bodyFont" label="Text" />
                </div>
              </SettingSection>

              <SettingSection title="Spacing">
                <OptionToggle v-model="settings.spacing" :options="SPACING_OPTIONS" label="Spacing" />
              </SettingSection>

              <SettingSection title="Text fields">
                <OptionToggle v-model="settings.fieldStyle" :options="FIELD_STYLE_OPTIONS" label="Text fields" />
              </SettingSection>

              <SettingSection title="Density">
                <OptionToggle v-model="settings.density" :options="DENSITY_OPTIONS" label="Density" />
              </SettingSection>

              <SettingSection title="Cards">
                <OptionToggle v-model="settings.cardStyle" :options="CARD_STYLE_OPTIONS" label="Card style" />
              </SettingSection>

              <SettingSection title="Shadows">
                <OptionToggle v-model="settings.shadowProfile" :options="SHADOW_PROFILE_OPTIONS" label="Shadows" />
              </SettingSection>

              <SettingSection title="Buttons and ripples">
                <OptionToggle
                  v-model="settings.interactiveStyle"
                  :options="INTERACTIVE_STYLE_OPTIONS"
                  label="Buttons and ripples"
                />
              </SettingSection>

              <SettingSection title="Corner radius">
                <VSelect
                  v-model="settings.radius"
                  :items="RADIUS_OPTIONS"
                  item-title="title"
                  item-value="value"
                  variant="outlined"
                  density="compact"
                  hide-details
                  aria-label="Corner radius"
                />
              </SettingSection>
            </div>
          </VWindowItem>
          <VWindowItem :value="CustomizerTab.Export">
            <ThemeExportPanel :settings="settings" />
          </VWindowItem>
        </VWindow>
      </VCardText>
    </VCard>
  </VDialog>
</template>

<style scoped>
/* In a scrollable dialog only the body may shrink; the title and tabs keep their height. */
.theme-dialog__fixed {
  flex-shrink: 0;
}
.font-selects {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
  padding-top: 4px;
}
.custom-colors {
  display: flex;
  gap: 16px;
  margin-top: 8px;
  font-size: 13px;
}
.custom-colors label {
  display: flex;
  align-items: center;
  gap: 8px;
}
.custom-colors input {
  width: 32px;
  height: 24px;
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;
}
</style>
