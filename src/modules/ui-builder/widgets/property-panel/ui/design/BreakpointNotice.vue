<script setup lang="ts">
import { computed } from 'vue'
import {
  BREAKPOINT_MIN_WIDTHS,
  hasOverrides,
  overrideTarget,
  useUiTreeStore,
  type UiNode,
} from '../../../../entities/ui-node'

/** Says which screen sizes the controls below change, and offers to go back to what smaller screens have. */
const props = defineProps<{ node: UiNode }>()
const store = useUiTreeStore()

const target = computed(() => overrideTarget(store.editingBreakpoint))
const changed = computed(() => !!target.value && hasOverrides(props.node, target.value))
</script>

<template>
  <div v-if="target" class="breakpoint-notice" role="status">
    <p>
      Editing <strong>{{ target.toUpperCase() }}</strong>: values you change here apply from
      {{ BREAKPOINT_MIN_WIDTHS[target] }}px up; the rest is inherited.
    </p>
    <VBtn
      v-if="changed"
      size="x-small"
      variant="text"
      prepend-icon="mdi-restore"
      @click="store.resetNodeOverrides(node.id)"
    >
      Reset to inherited
    </VBtn>
  </div>
</template>

<style scoped>
.breakpoint-notice {
  margin-bottom: 12px;
  padding: 8px 10px;
  border-radius: 6px;
  background: rgba(var(--v-theme-primary), 0.08);
  font-size: 12px;
}
.breakpoint-notice p {
  margin: 0;
}
</style>
