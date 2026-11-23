<script setup lang="ts">
import { provide, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useUiTreeStore } from '../../../entities/ui-node'
import { LAYERS_HELP } from '../model/sidebarViews'
import SidebarTreeNode from './SidebarTreeNode.vue'

/** The page as a tree of elements. The tree keeps one focusable row, which follows the selection. */
const store = useUiTreeStore()
const { rootNode, selectedNodeIds } = storeToRefs(store)

const activeTreeId = ref(rootNode.value.id)
provide('ui-builder-active-tree-id', activeTreeId)
provide('ui-builder-set-active-tree-id', (id: string) => {
  activeTreeId.value = id
})
watch(
  selectedNodeIds,
  ids => {
    if (ids[0]) activeTreeId.value = ids[0]
  },
  { immediate: true },
)
</script>

<template>
  <div class="sidebar-view__scroll">
    <p id="layers-help" class="sr-only">{{ LAYERS_HELP }}</p>
    <div role="tree" aria-label="Page layers" aria-describedby="layers-help" aria-multiselectable="true" class="pa-2">
      <SidebarTreeNode :node="rootNode" :depth="0" />
    </div>
  </div>
</template>

<style scoped>
/* The scrolling frame is styled by the sidebar that hosts this view. */
</style>
