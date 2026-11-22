<script setup lang="ts">
import { SpacingType } from '../../../entities/ui-node/model/enums'
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useUiTreeStore } from '../../../entities/ui-node/model/store'
import { useSpacingEditor } from '../model/useSpacingEditor'

/** What can be edited while several elements are selected: their shared margin and padding. */
const store = useUiTreeStore()
const { selectedNodeIds } = storeToRefs(store)
const { activeSpacingType, spacingSides, spacingSizes, commonSpacing, updateCommonSpacing } = useSpacingEditor(
  computed(() => null),
  selectedNodeIds,
  id => store.findNodeById(id),
  (id, classes) => store.updateNodeClasses(id, classes),
  () => store.commit(),
)
</script>

<template>
  <section class="pa-4">
    <h2 class="text-subtitle-1 font-weight-bold">{{ selectedNodeIds.length }} elements selected</h2>
    <p class="text-body-2 my-3">
      Shared spacing applies to every selected element. Select one layer to edit its content and appearance.
    </p>
    <VBtnToggle v-model="activeSpacingType" mandatory density="compact" color="primary" variant="outlined" class="mb-4"
      ><VBtn :value="SpacingType.Margin">Margin</VBtn><VBtn :value="SpacingType.Padding">Padding</VBtn></VBtnToggle
    >
    <VSelect
      v-for="side in spacingSides"
      :key="side.value"
      :label="side.label"
      :items="spacingSizes"
      :model-value="commonSpacing(side.value)"
      variant="outlined"
      density="compact"
      hide-details
      class="mb-3"
      @update:model-value="value => updateCommonSpacing(side.value, value)"
    />
  </section>
</template>
