<script setup lang="ts">
import { computed } from 'vue'
import { useTheme } from 'vuetify'
import { NodeRenderer, useUiTreeStore } from '../../../entities/ui-node'
import { ThemeDefaultsProvider } from '../../../../theme/entities/theme-settings'
import { usePreviewStyles } from '../model/usePreviewStyles'
import PreviewMessage from './PreviewMessage.vue'

/** The running project as the person using it sees it: the page, inside the shared layout when there is one. */
const store = useUiTreeStore()
const theme = useTheme()
const previewStyles = usePreviewStyles()
// A new key draws the page anew, so elements appear again. A shared layout stays while its pages change.
const previewKey = computed(() => `${store.project.layout ? 'layout' : store.previewPage.id}:${store.previewRun}`)
</script>

<template>
  <div class="v-application preview-app" :class="`v-theme--${theme.global.name.value}`">
    <component :is="'style'">{{ previewStyles }}</component>
    <ThemeDefaultsProvider>
      <NodeRenderer :key="previewKey" :node="store.previewRoot" :in-page="!store.project.layout" />
    </ThemeDefaultsProvider>
    <PreviewMessage />
  </div>
</template>
