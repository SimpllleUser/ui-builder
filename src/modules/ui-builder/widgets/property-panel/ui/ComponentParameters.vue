<script setup lang="ts">
import { computed } from 'vue'
import { findPrefabPropNames, useUiTreeStore, type Prefab } from '../../../entities/ui-node'
import { ParameterList } from '../../../features/component-parameters'

/** The parameters of the saved component being edited. */
const props = defineProps<{ prefab: Prefab }>()
const store = useUiTreeStore()
const usedNames = computed(() => findPrefabPropNames(props.prefab.node))
</script>

<template>
  <ParameterList
    :parameters="prefab.props ?? []"
    :used-names="usedNames"
    @save="parameter => store.setPrefabParameter(prefab.prefabId, parameter)"
    @remove="name => store.removePrefabParameter(prefab.prefabId, name)"
  />
</template>
