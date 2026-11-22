<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useUiTreeStore } from '../../../entities/ui-node/model/store'
import { WRAP_CONTAINER_TYPES, getComponentDef } from '../../../entities/ui-node/model/componentDefinitions'
import { ROOT_NODE_ID } from '../../../entities/ui-node/model/constants'

/** Offers to wrap several selected siblings in a container, or to lift the children out of a selected container. */
const store = useUiTreeStore()
const { selectedNodeIds } = storeToRefs(store)

const canWrap = computed(() => selectedNodeIds.value.length >= 2 && store.areNodesSiblings(selectedNodeIds.value))
const canUnwrap = computed(() => {
  if (selectedNodeIds.value.length !== 1) return false
  const id = selectedNodeIds.value[0]
  if (id === ROOT_NODE_ID) return false
  const node = store.findNodeById(id)
  return !!node && node.children?.length > 0 && !!getComponentDef(node.type)?.isWrapContainer
})
</script>

<template>
  <VSlideYReverseTransition>
    <div v-if="canWrap || canUnwrap" class="wrap-toolbar">
      <template v-if="canWrap">
        <span class="wrap-label">Wrap {{ selectedNodeIds.length }} items:</span>
        <div class="wrap-chips">
          <button
            v-for="type in WRAP_CONTAINER_TYPES"
            :key="type.type"
            class="wrap-chip"
            @click="store.wrapNodes(selectedNodeIds, type.type)"
          >
            <VIcon :icon="type.icon" size="12" class="mr-1" />
            {{ type.label }}
          </button>
        </div>
      </template>

      <template v-else-if="canUnwrap">
        <span class="wrap-label">Unwrap:</span>
        <p v-if="store.unwrapReason(selectedNodeIds[0])" class="text-caption">
          {{ store.unwrapReason(selectedNodeIds[0]) }}
        </p>
        <div class="wrap-chips">
          <button
            class="wrap-chip wrap-chip--unwrap"
            :disabled="!!store.unwrapReason(selectedNodeIds[0])"
            @click="store.unwrapNode(selectedNodeIds[0])"
          >
            <VIcon icon="mdi-arrow-expand-all" size="12" class="mr-1" />
            Lift children up
          </button>
        </div>
      </template>
    </div>
  </VSlideYReverseTransition>
</template>

<style scoped>
.wrap-toolbar {
  padding: 8px 10px;
  background: rgb(var(--v-theme-surface-light));
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex-shrink: 0;
}

.wrap-label {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  opacity: 0.7;
  text-transform: uppercase;
}

.wrap-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.wrap-chip {
  display: inline-flex;
  align-items: center;
  padding: 6px 10px;
  border-radius: 12px;
  font-size: 12px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.2);
  background: rgba(var(--v-theme-surface), 0.9);
  color: rgb(var(--v-theme-on-surface));
  cursor: pointer;
  transition:
    background 0.15s,
    border-color 0.15s;
}

.wrap-chip:hover {
  background: rgba(var(--v-theme-primary), 0.12);
  border-color: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-primary));
}

.wrap-chip--unwrap:hover {
  background: rgba(var(--v-theme-warning), 0.12);
  border-color: rgb(var(--v-theme-warning));
  color: rgb(var(--v-theme-warning));
}

.wrap-chip:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
