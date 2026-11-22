<script setup lang="ts">
import { computed } from 'vue'
import { useUiTreeStore } from '../../../../entities/ui-node/model/store'
import type { UiNode } from '../../../../entities/ui-node/model/types'
import { useStyleEditor } from '../../model/useStyleEditor'

const JUSTIFY_OPTIONS = ['justify-start', 'justify-center', 'justify-space-between', 'justify-end']

/** How the element lays out its children: block or flex, and how flex items are spread. */
const props = defineProps<{ node: UiNode }>()
const store = useUiTreeStore()
const { flexOptions, getFlexValue, setFlexValue, getJustifyValue, setJustifyValue } = useStyleEditor(
  computed(() => props.node),
  (id, classes) => store.updateNodeClasses(id, classes),
)
</script>

<template>
  <VSelect
    label="Display Type"
    :items="flexOptions"
    :model-value="getFlexValue()"
    density="compact"
    variant="outlined"
    class="mb-3"
    hide-details
    @update:model-value="setFlexValue"
  />
  <template v-if="node.classes.includes('d-flex')">
    <div class="text-caption mb-1">Justify</div>
    <VSelect
      :items="JUSTIFY_OPTIONS"
      label="Justify"
      density="compact"
      variant="outlined"
      class="mb-3"
      hide-details
      :model-value="getJustifyValue()"
      @update:model-value="setJustifyValue"
    />
  </template>
</template>
