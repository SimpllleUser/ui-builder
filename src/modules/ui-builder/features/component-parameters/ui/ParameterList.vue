<script setup lang="ts">
import { computed, ref } from 'vue'
import { PREFAB_PROP_TYPE_LABELS, prefabPropType, type PrefabProp } from '../../../entities/ui-node'
import ParameterDialog from './ParameterDialog.vue'

/** The parameters of a component, like the columns of a table: each with its type, and a form to add or change one. */
const props = defineProps<{
  parameters: PrefabProp[]
  /** Names used inside the component; such a parameter cannot be removed, only reset. */
  usedNames: string[]
}>()
const emit = defineEmits<{ save: [parameter: PrefabProp]; remove: [name: string] }>()

const open = ref(false)
const editing = ref<PrefabProp | null>(null)
const takenNames = computed(() => props.parameters.map(item => item.name))
const show = (parameter: PrefabProp | null) => {
  editing.value = parameter
  open.value = true
}
const summary = (parameter: PrefabProp) =>
  [
    PREFAB_PROP_TYPE_LABELS[prefabPropType(parameter)],
    ...(parameter.required ? ['required'] : []),
    ...(parameter.defaultValue ? [`default ${parameter.defaultValue}`] : []),
    ...(props.usedNames.includes(parameter.name) ? [] : ['not used yet']),
  ].join(' · ')
</script>

<template>
  <section class="parameters" aria-label="Parameters">
    <h3 class="parameters__title">Parameters</h3>
    <ul v-if="parameters.length" class="parameters__list">
      <li v-for="parameter in parameters" :key="parameter.name" class="parameter">
        <div class="parameter__text">
          <code>{{ parameter.name }}</code>
          <span class="parameter__summary">{{ summary(parameter) }}</span>
        </div>
        <VBtn
          icon="mdi-pencil-outline"
          size="x-small"
          variant="text"
          :aria-label="`Edit parameter ${parameter.name}`"
          @click="show(parameter)"
        />
        <VBtn
          v-if="!usedNames.includes(parameter.name)"
          icon="mdi-delete-outline"
          size="x-small"
          variant="text"
          color="error"
          :aria-label="`Delete parameter ${parameter.name}`"
          @click="emit('remove', parameter.name)"
        />
      </li>
    </ul>
    <VBtn size="small" variant="tonal" prepend-icon="mdi-plus" @click="show(null)">Create parameter</VBtn>
    <ParameterDialog
      v-model="open"
      :parameter="editing"
      :taken-names="takenNames"
      @save="parameter => emit('save', parameter)"
    />
  </section>
</template>

<style scoped>
.parameters {
  margin-bottom: 12px;
}
.parameters__title {
  margin-bottom: 6px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  opacity: 0.7;
}
.parameters__list {
  margin: 0 0 8px;
  padding: 0;
  list-style: none;
}
.parameter {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 4px 0;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.15);
}
.parameter__text {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  font-size: 12px;
  overflow-wrap: anywhere;
}
.parameter__summary {
  opacity: 0.65;
}
</style>
