<script setup lang="ts">
import { computed } from 'vue'
import { useClipboard } from '@vueuse/core'
import { generateThemeCss, generateVuetifyConfig, type ThemeSettings } from '../../../entities/theme-settings'

const COPIED_MESSAGE_MS = 2000

const props = defineProps<{ settings: ThemeSettings }>()
const { copy, copied } = useClipboard({ copiedDuring: COPIED_MESSAGE_MS })

const config = computed(() => generateVuetifyConfig(props.settings))
const css = computed(() => generateThemeCss(props.settings))
</script>

<template>
  <div class="d-flex flex-column ga-3">
    <p class="text-body-2 text-medium-emphasis">
      Put this in the <code>vuetify.ts</code> of your app, so it looks the way it does in the editor.
    </p>
    <pre class="theme-export__code" tabindex="0" aria-label="Vuetify configuration">{{ config }}</pre>
    <template v-if="css">
      <p class="text-body-2 text-medium-emphasis">Add the corner radius and shadows to a global stylesheet:</p>
      <pre class="theme-export__code" tabindex="0" aria-label="Global styles">{{ css }}</pre>
    </template>
    <div>
      <VBtn
        color="primary"
        variant="flat"
        :prepend-icon="copied ? 'mdi-check' : 'mdi-content-copy'"
        @click="copy(css ? `${config}\n/* global.css */\n${css}` : config)"
      >
        {{ copied ? 'Copied' : 'Copy' }}
      </VBtn>
    </div>
  </div>
</template>

<style scoped>
.theme-export__code {
  overflow: auto;
  max-height: 320px;
  padding: 12px;
  border-radius: 8px;
  background: rgba(var(--v-theme-on-surface), 0.06);
  font-size: 12px;
  line-height: 1.5;
}
</style>
