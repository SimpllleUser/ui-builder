<script setup lang="ts">
import { provide } from 'vue'
import { addChildAtPath, emptyJsonValue, removeAtPath, setAtPath, type JsonKind, type JsonPath } from '../lib/jsonTree'
import { JSON_TREE_CONTEXT } from './jsonTreeContext'
import JsonTreeRow from './JsonTreeRow.vue'

/** A JSON document as a tree: values are edited in place, items are added and removed. It never changes its input. */
const props = withDefaults(defineProps<{ modelValue: unknown; rootLabel?: string }>(), { rootLabel: 'root' })
const emit = defineEmits<{ 'update:modelValue': [value: unknown] }>()

provide(JSON_TREE_CONTEXT, {
  change: (path: JsonPath, value: unknown) => emit('update:modelValue', setAtPath(props.modelValue, path, value)),
  remove: (path: JsonPath) => emit('update:modelValue', removeAtPath(props.modelValue, path)),
  add: (path: JsonPath, key: string, kind: JsonKind) =>
    emit('update:modelValue', addChildAtPath(props.modelValue, path, key, emptyJsonValue(kind))),
})
</script>

<template>
  <div class="json-tree" role="tree">
    <JsonTreeRow :label="rootLabel" :value="modelValue" :path="[]" is-root />
  </div>
</template>
