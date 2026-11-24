<script setup lang="ts">
import { computed, inject, ref } from 'vue'
import { isJsonContainer, jsonEntries, jsonKind, JsonKind, type JsonPath } from '../lib/jsonTree'
import JsonAddForm from './JsonAddForm.vue'
import { JSON_TREE_CONTEXT } from './jsonTreeContext'

/** One line of a JSON tree: a primitive is edited here, an array or object lists its items below. */
const props = defineProps<{ label: string; value: unknown; path: JsonPath; isRoot?: boolean }>()
const tree = inject(JSON_TREE_CONTEXT)
if (!tree) throw new Error('A JSON tree row must be used inside a JsonTreeEditor.')

const isOpen = ref(true)
const isAdding = ref(false)
const kind = computed(() => jsonKind(props.value))
const isContainer = computed(() => isJsonContainer(props.value))
const entries = computed(() => jsonEntries(props.value))
const textValue = computed(() => String(props.value))
const isChecked = computed(() => props.value === true)
const summary = computed(() =>
  kind.value === JsonKind.Array ? `[ ${entries.value.length} ]` : `{ ${entries.value.length} }`,
)

const changeText = (text: unknown) => {
  if (typeof text === 'string') tree.change(props.path, text)
}
const changeNumber = (text: unknown) => {
  const number = Number(text)
  if (typeof text === 'string' && text.trim() && Number.isFinite(number)) tree.change(props.path, number)
}
const add = (key: string, newKind: JsonKind) => {
  tree.add(props.path, key, newKind)
  isAdding.value = false
  isOpen.value = true
}
</script>

<template>
  <div class="json-row" role="treeitem" :aria-expanded="isContainer ? isOpen : undefined">
    <div class="json-row__line">
      <button
        v-if="isContainer"
        type="button"
        class="json-row__toggle"
        :aria-label="`${isOpen ? 'Collapse' : 'Expand'} ${label}`"
        @click="isOpen = !isOpen"
      >
        <VIcon :icon="isOpen ? 'mdi-chevron-down' : 'mdi-chevron-right'" size="16" aria-hidden="true" />
      </button>
      <span v-else class="json-row__toggle" aria-hidden="true" />

      <span class="json-row__key" :class="{ 'json-row__key--group': isContainer }">{{ label }}</span>
      <span v-if="isContainer" class="json-row__count">{{ summary }}</span>

      <VTextField
        v-else-if="kind === JsonKind.String"
        :model-value="textValue"
        :aria-label="label"
        variant="outlined"
        density="compact"
        hide-details
        single-line
        class="json-row__field"
        @update:model-value="changeText"
      />
      <VTextField
        v-else-if="kind === JsonKind.Number"
        :model-value="textValue"
        :aria-label="label"
        type="number"
        variant="outlined"
        density="compact"
        hide-details
        single-line
        class="json-row__field"
        @update:model-value="changeNumber"
      />
      <VSwitch
        v-else-if="kind === JsonKind.Boolean"
        :model-value="isChecked"
        :aria-label="label"
        color="primary"
        density="compact"
        hide-details
        class="json-row__switch"
        @update:model-value="tree.change(path, !!$event)"
      />
      <span v-else class="json-row__null">null</span>

      <span class="json-row__actions">
        <VMenu v-if="isContainer" v-model="isAdding" :close-on-content-click="false" location="bottom end">
          <template #activator="{ props: menu }">
            <VBtn
              v-bind="menu"
              icon="mdi-plus"
              size="x-small"
              variant="text"
              :aria-label="`Add to ${label}`"
              :title="`Add to ${label}`"
            />
          </template>
          <JsonAddForm :parent="value" @add="add" @cancel="isAdding = false" />
        </VMenu>
        <VBtn
          v-if="!isRoot"
          icon="mdi-close"
          size="x-small"
          variant="text"
          color="error"
          :aria-label="`Remove ${label}`"
          :title="`Remove ${label}`"
          @click="tree.remove(path)"
        />
      </span>
    </div>

    <div v-if="isContainer && isOpen" class="json-row__children" role="group">
      <JsonTreeRow
        v-for="entry in entries"
        :key="entry.key"
        :label="entry.key"
        :value="entry.value"
        :path="[...path, entry.key]"
      />
      <p v-if="!entries.length" class="json-row__empty">Empty. Use + to add an item.</p>
    </div>
  </div>
</template>

<style scoped>
.json-row__line {
  display: flex;
  align-items: center;
  gap: 4px;
  min-height: 36px;
}
.json-row__toggle {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
}
.json-row__key {
  flex-shrink: 0;
  max-width: 40%;
  overflow: hidden;
  font-size: 12px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: rgba(var(--v-theme-on-surface), 0.75);
}
.json-row__key--group {
  color: rgb(var(--v-theme-primary));
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.json-row__count {
  padding: 0 6px;
  border-radius: 8px;
  background: rgba(var(--v-theme-primary), 0.12);
  color: rgb(var(--v-theme-primary));
  font-size: 12px;
}
.json-row__field {
  flex: 1;
  min-width: 0;
  font-size: 12px;
}
.json-row__switch {
  flex: 1;
  justify-content: flex-end;
}
.json-row__null {
  flex: 1;
  color: rgba(var(--v-theme-on-surface), 0.5);
  font-size: 12px;
  font-style: italic;
}
.json-row__actions {
  display: flex;
  flex-shrink: 0;
  margin-left: auto;
  opacity: 0;
  transition: opacity 0.1s;
}
.json-row__line:hover .json-row__actions,
.json-row__line:focus-within .json-row__actions {
  opacity: 1;
}
.json-row__children {
  margin-left: 9px;
  padding-left: 8px;
  border-left: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.json-row__empty {
  padding: 4px 0;
  color: rgba(var(--v-theme-on-surface), 0.55);
  font-size: 12px;
}
</style>
