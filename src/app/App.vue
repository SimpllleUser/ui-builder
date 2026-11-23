<script setup lang="ts">
import { AppView } from './appView'
import { ref, defineAsyncComponent, onMounted, onBeforeUnmount } from 'vue'
import { useUiTreeStore } from '../modules/ui-builder/entities/ui-node'
const BuilderApp = defineAsyncComponent(() => import('./BuilderApp.vue'))
const LegacyBuilder = defineAsyncComponent(() => import('../features/ui-builder/ui/UiBuilder.vue'))
// The previous editor is no longer offered in the menus. It stays reachable at /?classic for anyone who still needs it.
const view = ref<AppView>(new URLSearchParams(window.location.search).has('classic') ? AppView.Legacy : AppView.Current)
const leaveClassic = () => {
  view.value = AppView.Current
  window.history.replaceState(null, '', window.location.pathname)
}
const store = useUiTreeStore()
let disconnectMcp = () => {}
onMounted(async () => {
  if (!import.meta.env.DEV) return
  const { connectMcpBridge } = await import('../modules/ui-builder/features/mcp-bridge')
  disconnectMcp = connectMcpBridge(store)
})
onBeforeUnmount(() => disconnectMcp())
</script>

<template>
  <VApp>
    <!-- The current editor has its own toolbar; this header only exists to get back from the Classic editor. -->
    <VToolbar v-if="view === AppView.Legacy" height="56" class="app-header" title="UI Builder — Classic">
      <template #append>
        <VBtn prepend-icon="mdi-arrow-left" @click="leaveClassic">Back to editor</VBtn>
      </template>
    </VToolbar>
    <BuilderApp v-if="view === AppView.Current" />
    <div v-else class="legacy-workspace pa-4">
      <VAlert type="info" variant="tonal" class="mb-4"
        >Classic is the previous editor. Its document is separate and is not saved automatically.</VAlert
      >
      <LegacyBuilder />
    </div>
  </VApp>
</template>

<style>
html {
  overflow: hidden;
}
.v-application__wrap {
  height: 100dvh;
  min-height: 0 !important;
  overflow: hidden;
}
.app-header {
  flex: 0 0 auto !important;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}
.legacy-workspace {
  flex: 1;
  overflow: auto;
}
button:focus-visible,
[tabindex]:focus-visible,
summary:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 2px;
}
</style>
