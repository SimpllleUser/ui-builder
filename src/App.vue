<script setup lang="ts">
import { ref, defineAsyncComponent } from 'vue'
import BuilderApp from './BuilderApp.vue'
import { useUiTreeStore } from './modules/ui-builder/entities/ui-node/model/store'
const LegacyBuilder = defineAsyncComponent(() => import('./features/ui-builder/ui/UiBuilder.vue'))
const view = ref<'current' | 'legacy'>('current')
const store = useUiTreeStore()
</script>

<template>
  <VApp>
    <VToolbar v-if="!store.isPreviewMode" height="56" class="app-header" title="UI Builder">
      <template #append>
        <VBtn v-if="view === 'legacy'" prepend-icon="mdi-arrow-left" @click="view = 'current'">Back to editor</VBtn>
        <VMenu v-else>
          <template #activator="{ props }"><VBtn v-bind="props" icon="mdi-dots-horizontal" aria-label="More options" title="More options" /></template>
          <VList><VListItem title="Classic — previous version" subtitle="Separate workspace; changes are not shared" @click="view = 'legacy'" /></VList>
        </VMenu>
      </template>
    </VToolbar>
    <BuilderApp v-if="view === 'current'" />
    <div v-else class="legacy-workspace pa-4">
      <VAlert type="info" variant="tonal" class="mb-4">Classic is the previous editor. Its document is separate and is not saved automatically.</VAlert>
      <LegacyBuilder />
    </div>
  </VApp>
</template>

<style>
html { overflow: hidden; }
.v-application__wrap { height: 100dvh; min-height: 0 !important; overflow: hidden; }
.app-header { flex: 0 0 auto !important; border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity)); }
.legacy-workspace { flex: 1; overflow: auto; }
button:focus-visible, [tabindex]:focus-visible, summary:focus-visible { outline: 2px solid rgb(var(--v-theme-primary)); outline-offset: 2px; }
</style>
