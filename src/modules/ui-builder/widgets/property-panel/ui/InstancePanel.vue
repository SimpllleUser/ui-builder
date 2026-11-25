<script setup lang="ts">
import { computed } from 'vue'
import { useUiTreeStore, type UiNode } from '../../../entities/ui-node'

/** What can be done with a component instance: fill its parameters, edit the original or detach the copy. */
const props = defineProps<{ node: UiNode }>()
const store = useUiTreeStore()

const original = computed(() => store.originalOf(props.node.id))
const parameters = computed(() =>
  (original.value?.props ?? []).map(({ name, defaultValue }) => ({
    name,
    value: props.node.instance?.values[name] ?? defaultValue,
  })),
)
const update = (name: string, value: string) => store.setInstanceProps(props.node.id, { [name]: value })
</script>

<template>
  <div class="instance-panel">
    <template v-if="original">
      <p class="instance-panel__note">
        <VIcon icon="mdi-puzzle-outline" size="16" aria-hidden="true" />
        Instance of <strong>{{ original.name }}</strong>. It changes when the original does.
      </p>
      <VTextField
        v-for="parameter in parameters"
        :key="parameter.name"
        :model-value="parameter.value"
        :label="parameter.name"
        variant="outlined"
        density="compact"
        hide-details
        class="mb-2"
        @update:model-value="value => update(parameter.name, value)"
        @blur="store.commit()"
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
