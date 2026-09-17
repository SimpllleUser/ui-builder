<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue'
import MainCanvas from './modules/ui-builder/widgets/main-canvas/ui/MainCanvas.vue'
import SidebarTree from './modules/ui-builder/widgets/sidebar-tree/ui/SidebarTree.vue'
import PropertyPanel from './modules/ui-builder/widgets/property-panel/ui/PropertyPanel.vue'
import { useUiTreeStore } from './modules/ui-builder/entities/ui-node/model/store'

const store = useUiTreeStore()

const onKey = (e: KeyboardEvent) => {
  const mod = e.ctrlKey || e.metaKey
  if (!mod) return
  const key = e.key.toLowerCase()
  if (key === 'z' && !e.shiftKey) { e.preventDefault(); store.undo() }
  else if ((key === 'z' && e.shiftKey) || key === 'y') { e.preventDefault(); store.redo() }
}

onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="builder-layout">
    <SidebarTree />

    <VMain>
      <MainCanvas />
    </VMain>

    <PropertyPanel />
  </div>
</template>

<style scoped>
.builder-layout { display: flex; min-height: calc(100vh - 48px); }
</style>
