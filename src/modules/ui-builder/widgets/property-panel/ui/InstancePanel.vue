<script setup lang="ts">
import { computed, ref } from 'vue'
import { prefabValueError, useUiTreeStore, type PrefabProp, type UiNode } from '../../../entities/ui-node'
import { ParameterValueField } from '../../../features/component-parameters'

/** What can be done with a component instance: fill its parameters, edit the original or detach the copy. */
const props = defineProps<{ node: UiNode }>()
const store = useUiTreeStore()

const original = computed(() => store.originalOf(props.node.id))
/** Values typed but not valid yet: they stay in their field with the reason, and the instance keeps the last good one. */
const drafts = ref<Record<string, string>>({})
const parameters = computed(() =>
  (original.value?.props ?? []).map(definition => ({
    definition,
    value: drafts.value[definition.name] ?? props.node.instance?.values[definition.name] ?? definition.defaultValue,
  })),
)
const update = (definition: PrefabProp, value: string) => {
  const { name } = definition
  if (prefabValueError(definition, value)) {
    drafts.value = { ...drafts.value, [name]: value }
    return
  }
  const { [name]: _applied, ...others } = drafts.value
  drafts.value = others
  store.setInstanceProps(props.node.id, { [name]: value })
}
</script>

<template>
  <div class="instance-panel">
    <template v-if="original">
      <p class="instance-panel__note">
        <VIcon icon="mdi-puzzle-outline" size="16" aria-hidden="true" />
        Instance of <strong>{{ original.name }}</strong>. It changes when the original does.
      </p>
      <ParameterValueField
        v-for="parameter in parameters"
        :key="parameter.definition.name"
        :parameter="parameter.definition"
        :model-value="parameter.value"
        @update:model-value="value => update(parameter.definition, value)"
        @focusout="store.commit()"
      />
      <div class="instance-panel__actions">
        <VBtn size="small" variant="tonal" prepend-icon="mdi-pencil" @click="store.editPrefab(original.prefabId)">
          Edit original
        </VBtn>
        <VBtn size="small" variant="text" prepend-icon="mdi-link-off" @click="store.detachInstance(node.id)">
          Detach
        </VBtn>
      </div>
    </template>
    <template v-else>
      <p class="instance-panel__note">
        <VIcon icon="mdi-link-off" size="16" aria-hidden="true" />
        Its original is not in My components, so this is an ordinary copy.
      </p>
      <VBtn size="small" variant="text" @click="store.detachInstance(node.id)">Remove the link</VBtn>
    </template>
  </div>
</template>

<style scoped>
.instance-panel {
  margin-bottom: 12px;
}
.instance-panel__note {
  margin: 0 0 10px;
  padding: 8px 10px;
  border-radius: 6px;
  background: rgba(var(--v-theme-primary), 0.08);
  font-size: 12px;
}
.instance-panel__actions {
  display: flex;
  gap: 8px;
}
</style>
