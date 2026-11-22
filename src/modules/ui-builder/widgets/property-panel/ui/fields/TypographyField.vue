<script setup lang="ts">
import { computed } from 'vue'
import { Icons } from '../../../../../../shared/icons'
import { useUiTreeStore } from '../../../../entities/ui-node/model/store'
import type { UiNode } from '../../../../entities/ui-node/model/types'
import { useStyleEditor } from '../../model/useStyleEditor'

const ALIGNMENTS = [
  { value: 'text-left', icon: Icons.FormatAlignLeft, label: 'Align text left' },
  { value: 'text-center', icon: Icons.FormatAlignCenter, label: 'Align text center' },
  { value: 'text-right', icon: Icons.FormatAlignRight, label: 'Align text right' },
]

/** Font weight and text alignment. */
const props = defineProps<{ node: UiNode }>()
const store = useUiTreeStore()
const { fontWeights, getFontWeight, setFontWeight, getTextAlign, setTextAlign } = useStyleEditor(
  computed(() => props.node),
  (id, classes) => store.updateNodeClasses(id, classes),
)
</script>

<template>
  <VSelect
    label="Weight"
    :items="fontWeights"
    :model-value="getFontWeight()"
    density="compact"
    variant="outlined"
    class="mb-3"
    hide-details
    @update:model-value="setFontWeight"
  />
  <VBtnToggle
    density="compact"
    color="primary"
    variant="outlined"
    class="mb-3"
    :model-value="getTextAlign()"
    @update:model-value="setTextAlign"
  >
    <VBtn
      v-for="alignment in ALIGNMENTS"
      :key="alignment.value"
      :value="alignment.value"
      :icon="alignment.icon"
      :aria-label="alignment.label"
      size="small"
    />
  </VBtnToggle>
</template>
