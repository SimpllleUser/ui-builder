<script setup lang="ts">
import { ref } from 'vue'
import BuilderApp from './BuilderApp.vue'
import LegacyBuilder from './features/ui-builder/ui/UiBuilder.vue'

const view = ref<'current' | 'legacy'>('current')
</script>

<template>
  <VApp>
    <VToolbar density="compact" title="UI Builder">
      <template #append>
        <VBtnToggle v-model="view" mandatory density="compact" variant="outlined">
          <VBtn value="current">Editor</VBtn>
          <VBtn value="legacy">Classic</VBtn>
        </VBtnToggle>
      </template>
    </VToolbar>
    <BuilderApp v-if="view === 'current'" />
    <VMain v-else class="pa-4"><LegacyBuilder /></VMain>
  </VApp>
</template>
