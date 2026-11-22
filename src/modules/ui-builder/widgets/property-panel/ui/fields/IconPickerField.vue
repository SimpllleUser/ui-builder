<script setup lang="ts">
import { Icons } from '../../../../../../shared/icons'
import { useUiTreeStore } from '../../../../entities/ui-node/model/store'
import type { UiNode } from '../../../../entities/ui-node/model/types'

/** Picks an icon by name. `preview` shows the chosen icon inside the field. */
const props = defineProps<{ node: UiNode; prop: string; label: string; preview?: boolean }>()
const store = useUiTreeStore()

// Some icons are listed under two names; the list keeps one per icon, since the picker identifies them by icon.
const icons = [...new Map(Object.entries(Icons).map(([name, value]) => [value, { name, value }])).values()]
const current = () => {
  const value = props.node.props[props.prop]
  return typeof value === 'string' ? value : null
}
</script>

<template>
  <VAutocomplete
    :model-value="current()"
    :items="icons"
    item-title="name"
    item-value="value"
    :label="label"
    variant="outlined"
    density="compact"
    class="mb-3"
    hide-details
    clearable
    @update:model-value="value => store.updateNodeProp(node.id, prop, value)"
  >
    <template #item="{ props: itemProps, item }">
      <VListItem v-bind="itemProps" :prepend-icon="item.raw.value" :title="item.raw.name" />
    </template>
    <template v-if="preview" #prepend-inner>
      <VIcon v-if="current()" :icon="current() ?? undefined" size="18" class="mr-1" />
    </template>
  </VAutocomplete>
</template>
