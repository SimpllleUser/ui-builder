<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue'
import { useStyleTag } from '@vueuse/core'
import { PREVIEW_FRAME_STYLE, PreviewPage } from '../modules/ui-builder/widgets/main-canvas'
import { useUiTreeStore } from '../modules/ui-builder/entities/ui-node'
import { useApplyTheme } from '../modules/theme/entities/theme-settings'
import { showScreenshotSource } from './shell/screenshotSource'

/**
 * The page the MCP server opens in a headless browser to take a picture of a project (see mcp/screenshot.mjs).
 * It holds nothing of its own: no storage is opened and no agent connects to it.
 */
const store = useUiTreeStore()
useApplyTheme()
useStyleTag(PREVIEW_FRAME_STYLE)
const ready = ref(false)

onMounted(() => {
  window.uiBuilderScreenshot = async source => {
    await showScreenshotSource(store, source)
    ready.value = true
    await nextTick()
    await document.fonts.ready
  }
})
</script>

<template>
  <VApp>
    <PreviewPage v-if="ready" />
  </VApp>
</template>
