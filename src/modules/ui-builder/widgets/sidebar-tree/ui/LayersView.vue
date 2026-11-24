<script setup lang="ts">
import { provide, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { isNodeEmpty, useUiTreeStore } from '../../../entities/ui-node'
import { LAYERS_HELP } from '../model/sidebarViews'
import EmptyState from '../../../../../shared/ui/EmptyState.vue'
import SidebarTreeNode from './SidebarTreeNode.vue'

/** The page as a tree of elements. The tree keeps one focusable row, which follows the selection. */
const emit = defineEmits<{ browseComponents: [] }>()
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
    <EmptyState
      v-if="isNodeEmpty(rootNode)"
      icon="mdi-file-tree-outline"
      title="Nothing on this page yet"
      description="Every element you add appears here as a tree, so you can select, rename and reorder it."
    >
      <VBtn
        color="primary"
        variant="tonal"
        size="small"
        prepend-icon="mdi-shape-outline"
        @click="emit('browseComponents')"
      >
        Browse components
      </VBtn>
    </EmptyState>
  </div>
</template>

<style scoped>
/* The scrolling frame is styled by the sidebar that hosts this view. */
</style>
