<script setup lang="ts">
import { AppView } from './appView'
import { ref, defineAsyncComponent, onBeforeUnmount } from 'vue'
import { StartupState, useProjectStartup } from './shell/useProjectStartup'
import { createMcpHost } from './shell/mcpHost'
import { createMcpTheme } from './shell/mcpTheme'
import {
  ProjectConflictBanner,
  ProjectDialog,
  ProjectDialogs,
  ProjectLockedScreen,
} from '../modules/projects/widgets/project-switcher'
import { MainCanvas } from '../modules/ui-builder/widgets/main-canvas'
import { useUiTreeStore } from '../modules/ui-builder/entities/ui-node'
import { useApplyTheme } from '../modules/theme/entities/theme-settings'
import './styles/global.css'
const BuilderApp = defineAsyncComponent(() => import('./BuilderApp.vue'))
const LegacyBuilder = defineAsyncComponent(() => import('../features/ui-builder/ui/UiBuilder.vue'))
// The previous editor is no longer offered in the menus. It stays reachable at /?classic for anyone who still needs it.
const view = ref<AppView>(new URLSearchParams(window.location.search).has('classic') ? AppView.Legacy : AppView.Current)
const leaveClassic = () => {
  view.value = AppView.Current
  window.history.replaceState(null, '', window.location.pathname)
}
const store = useUiTreeStore()
// Colours, mode, corners and shadows change the whole app; density and button style only the page being built.
useApplyTheme()
let disconnectMcp = () => {}
// Agents are let in only after a project is open: before that their changes would be lost.
const connectAgents = async () => {
  if (!import.meta.env.DEV) return
  const { connectMcpBridge } = await import('../modules/ui-builder/features/mcp-bridge')
  if (session.value)
    disconnectMcp = connectMcpBridge(
      store,
      createMcpHost(session.value, () => store.notice, createMcpTheme()),
    )
}
const { startup, session } = useProjectStartup(store, connectAgents)
const projectDialog = ref<ProjectDialog | null>(null)
const reload = () => window.location.reload()
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
    <template v-if="view === AppView.Current">
      <template v-if="startup === StartupState.Ready && session">
        <ProjectConflictBanner :session="session" />
        <ProjectLockedScreen v-if="session.isLocked.value" :session="session" @open="projectDialog = $event">
          <MainCanvas :key="session.openCount.value" preview-only />
        </ProjectLockedScreen>
        <!-- A new key per project, so nothing a panel remembers is carried into another one. -->
        <BuilderApp v-else :key="session.openCount.value" :session="session" @open-projects="projectDialog = $event" />
        <ProjectDialogs v-model="projectDialog" :session="session" />
      </template>
      <div v-else-if="startup === StartupState.Failed" class="pa-4">
        <VAlert type="error" variant="tonal" title="Could not open your projects">
          The browser's storage did not answer. Nothing was changed.
          <template #append><VBtn variant="text" @click="reload">Try again</VBtn></template>
        </VAlert>
      </div>
      <VProgressLinear v-else indeterminate aria-label="Opening your project" />
    </template>
    <div v-else class="legacy-workspace pa-4">
      <VAlert type="info" variant="tonal" class="mb-4"
        >Classic is the previous editor. Its document is separate and is not saved automatically.</VAlert
      >
      <LegacyBuilder />
    </div>
  </VApp>
</template>

<style>
.app-header {
  flex: 0 0 auto !important;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.legacy-workspace {
  flex: 1;
  overflow: auto;
}
</style>
