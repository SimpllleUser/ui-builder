<script setup lang="ts">
import { computed } from 'vue'
import { COLUMN_PROPS, columnPropFor, GRID_COLUMNS, useUiTreeStore, type UiNode } from '../../../../entities/ui-node'
import DesignSection from './DesignSection.vue'
import NumberField from './NumberField.vue'

/** The width of a grid column on the screen size being edited, in Vuetify's twelve columns. */
const props = defineProps<{ node: UiNode }>()
const store = useUiTreeStore()

const property = computed(() => columnPropFor(props.node.props, store.editingBreakpoint, window.innerWidth))
const columns = computed(() => {
  const value = Number(props.node.props[property.value])
  return value || null
})
const setColumns = (value: number | null) =>
  store.updateNodeProp(
    props.node.id,
    property.value,
    value === null ? undefined : Math.min(GRID_COLUMNS, Math.max(1, Math.round(value))),
  )
</script>

<template>
  <DesignSection title="Grid">
    <NumberField
      label="C"
      :title="`Columns of 12 (${property})`"
      :model-value="columns"
      :min="1"
      :placeholder="property === COLUMN_PROPS.xs ? 'auto' : 'inherited'"
      @update:model-value="setColumns"
    />
    <p class="grid-hint">
      Sets <code>{{ property }}</code> of the column.
    </p>
  </DesignSection>
</template>

<style scoped>
.grid-hint {
  margin: 4px 0 0;
  font-size: 12px;
  opacity: 0.7;
}
</style>
