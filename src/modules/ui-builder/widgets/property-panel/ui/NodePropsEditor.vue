<script setup lang="ts">
import { computed, ref } from 'vue'
import { isJsonRecord } from '../../../../../shared/lib/jsonTree'
import JsonTreeEditor from '../../../../../shared/ui/JsonTreeEditor.vue'
import { useUiTreeStore, type UiNode } from '../../../entities/ui-node'
import { PropsView } from '../model/propsView'

/** The element's properties as JSON, to edit as a tree or as text. Only `props` is here: the rest has its own tabs. */
const props = defineProps<{ node: UiNode }>()
const store = useUiTreeStore()

const view = ref(PropsView.Tree)
// The text being typed; null shows the saved properties again.
const draft = ref<string | null>(null)
const error = ref('')
const shownText = computed(() => draft.value ?? JSON.stringify(props.node.props, null, 2))

const applyProps = (value: unknown) => {
  if (isJsonRecord(value)) store.updateNodeProps(props.node.id, value)
}
const editText = (text: string) => {
  draft.value = text
  try {
    const parsed: unknown = JSON.parse(text)
    if (!isJsonRecord(parsed)) {
      error.value = 'Properties must be an object, such as { "color": "primary" }.'
      return
    }
    error.value = ''
    applyProps(parsed)
  } catch {
    error.value = 'Not valid JSON yet. The last valid properties are kept.'
  }
}
const leaveText = () => {
  draft.value = null
  error.value = ''
  store.commit()
}
</script>

<template>
  <div class="node-props">
    <VBtnToggle v-model="view" mandatory density="compact" variant="outlined" divided class="mb-3" color="primary">
      <VBtn :value="PropsView.Tree" size="small" prepend-icon="mdi-file-tree-outline">Tree</VBtn>
      <VBtn :value="PropsView.Text" size="small" prepend-icon="mdi-code-json">Text</VBtn>
    </VBtnToggle>

    <JsonTreeEditor
      v-if="view === PropsView.Tree"
      :model-value="node.props"
      root-label="props"
      @update:model-value="applyProps"
    />
    <VTextarea
      v-else
      :model-value="shownText"
      label="props (JSON)"
      variant="outlined"
      density="compact"
      auto-grow
      rows="8"
      spellcheck="false"
      class="node-props__text"
      :error-messages="error"
      @update:model-value="editText"
      @blur="leaveText"
    />
  </div>
</template>

<style scoped>
.node-props__text :deep(textarea) {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
}
</style>
