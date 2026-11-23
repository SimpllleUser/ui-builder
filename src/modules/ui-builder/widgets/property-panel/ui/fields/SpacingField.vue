<script setup lang="ts">
import { SpacingType, useUiTreeStore, type UiNode } from '../../../../entities/ui-node'
import { computed } from 'vue'
import { useSpacingEditor } from '../../model/useSpacingEditor'

/** Margin, and optionally padding, on each side of the element. */
const props = defineProps<{ node: UiNode; withPadding?: boolean }>()
const store = useUiTreeStore()
const node = computed(() => props.node)
const { activeSpacingType, spacingSides, spacingSizes, updateSpacing, getSpacingValue } = useSpacingEditor(
  node,
  computed(() => [props.node.id]),
  id => store.findNodeById(id),
  (id, classes) => store.updateNodeClasses(id, classes),
  () => store.commit(),
)
</script>

<template>
  <div class="d-flex justify-center mb-4">
    <VBtnToggle v-model="activeSpacingType" mandatory density="compact" color="primary" variant="outlined">
      <VBtn :value="SpacingType.Margin" size="small" class="px-4">Margin</VBtn>
      <VBtn v-if="withPadding" :value="SpacingType.Padding" size="small" class="px-4">Padding</VBtn>
    </VBtnToggle>
  </div>
  <VRow dense>
    <VCol v-for="side in spacingSides" :key="side.value" cols="6">
      <VSelect
        :label="side.label"
        :items="spacingSizes"
        :model-value="getSpacingValue(activeSpacingType, side.value)"
        density="compact"
        variant="outlined"
        hide-details
        @update:model-value="value => updateSpacing(activeSpacingType, side.value, value)"
      />
    </VCol>
  </VRow>
</template>
