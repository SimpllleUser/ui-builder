<script setup lang="ts">
import EmptyState from '../../../../../shared/ui/EmptyState.vue'
import ComputedVariables from './ComputedVariables.vue'
import DataSourceFields from './DataSourceFields.vue'
import { computed, ref } from 'vue'
import {
  findVariableUsages,
  isComputed,
  parseLiteral,
  useUiTreeStore,
  variableNameError,
  type VariableUsage,
} from '../../../entities/ui-node'
import { useCheckedDrafts } from '../../../../../shared/lib/useCheckedDrafts'
import {
  buildVariableRows,
  countLabel,
  formatVariableValue,
  USAGE_LABELS,
  VARIABLE_TYPE_VIEW,
  type VariableRow,
} from '../model/variableList'

/** Every variable of the project: what it holds at the start, what kind of value it is, and what uses it. */
const store = useUiTreeStore()

const rows = computed(() => buildVariableRows(store.project.state, findVariableUsages(store.project)))
const expanded = ref<string | null>(null)
const dataOpen = ref<string | null>(null)
const toggleData = (name: string) => (dataOpen.value = dataOpen.value === name ? null : name)
const newName = ref('')
const newValue = ref('')
const newNameError = computed(() => {
  const name = newName.value.trim()
  if (!name) return null
  const taken = name in store.project.state || isComputed(store.project, name)
  return variableNameError(name) ?? (taken ? 'A variable with this name already exists.' : null)
})

const addVariable = () => {
  if (!newName.value.trim() || newNameError.value) return
  if (store.setStateVariable(newName.value.trim(), parseLiteral(newValue.value))) {
    newName.value = ''
    newValue.value = ''
  }
}

// A value is applied when the person leaves the field, so typing `12` does not pass through `1` first.
const values = useCheckedDrafts(
  () => null,
  (name, text) => store.setStateVariable(name, parseLiteral(text)),
)

const toggle = (name: string) => (expanded.value = expanded.value === name ? null : name)
const goTo = (usage: VariableUsage) => {
  if (usage.pageId) store.selectPage(usage.pageId)
  else store.editLayout(true)
  store.selectNode(usage.nodeId)
}
const usageTitle = (usage: VariableUsage) => `${usage.nodeName}, ${USAGE_LABELS[usage.kind]}`
const remove = (row: VariableRow) => store.removeStateVariable(row.name)
</script>

<template>
  <div class="sidebar-view__scroll variables-view">
    <p class="variables-view__help text-caption text-medium-emphasis">
      Values the page remembers while you preview it, such as whether a menu is open or what was typed in a box. Use one
      in an element's Behavior or show it in text with double curly braces.
    </p>

    <form class="variables-view__add" @submit.prevent="addVariable">
      <VTextField
        v-model="newName"
        :error-messages="newNameError ?? []"
        label="New variable"
        placeholder="isOpen"
        variant="outlined"
        density="compact"
        hide-details="auto"
        spellcheck="false"
      />
      <VTextField
        v-model="newValue"
        label="Starting value"
        placeholder="false"
        variant="outlined"
        density="compact"
        hide-details
        spellcheck="false"
      />
      <VBtn type="submit" color="primary" variant="tonal" size="small" prepend-icon="mdi-plus">Add variable</VBtn>
    </form>

    <EmptyState
      v-if="!rows.length"
      icon="mdi-variable"
      title="No variables yet"
      description="Add one above, or type a new name in an element's Behavior and it is created for you."
    />

    <ul v-else class="variables-view__list">
      <li v-for="row in rows" :key="row.name" class="variable">
        <div class="variable__head">
          <VIcon
            :icon="VARIABLE_TYPE_VIEW[row.type].icon"
            size="16"
            :title="VARIABLE_TYPE_VIEW[row.type].label"
            aria-hidden="true"
          />
          <code class="variable__name">{{ row.name }}</code>
          <span class="sr-only">{{ VARIABLE_TYPE_VIEW[row.type].label }}</span>
          <VSpacer />
          <VMenu v-if="row.elementCount" location="bottom end" :close-on-content-click="false">
            <template #activator="{ props: menu }">
              <VBtn v-bind="menu" size="x-small" variant="text" append-icon="mdi-menu-down">
                {{ countLabel(row.elementCount) }}
              </VBtn>
            </template>
            <VCard min-width="260" max-width="340">
              <VCardText class="text-body-2">
                Deleting <code>{{ row.name }}</code> would leave {{ countLabel(row.elementCount).toLowerCase() }}
                reading nothing. Press Undo if you change your mind.
              </VCardText>
              <VCardActions>
                <VSpacer />
                <VBtn color="error" size="small" variant="tonal" @click="remove(row)">Delete anyway</VBtn>
              </VCardActions>
            </VCard>
          </VMenu>
          <VChip v-else size="x-small" label color="info" variant="tonal">Not used</VChip>
          <VBtn
            v-if="!row.elementCount"
            icon="mdi-delete-outline"
            size="x-small"
            variant="text"
            color="error"
            :aria-label="`Delete ${row.name}`"
            @click="remove(row)"
          />
        </div>

        <VTextField
          :model-value="values.shown(row.name, formatVariableValue(row.value))"
          :label="`Starting value of ${row.name}`"
          variant="outlined"
          density="compact"
          hide-details
          spellcheck="false"
          @update:model-value="text => values.edit(row.name, text)"
          @blur="values.commit(row.name)"
          @keydown.enter="values.commit(row.name)"
        />

        <button
          class="variable__toggle text-caption"
          :aria-expanded="dataOpen === row.name"
          @click="toggleData(row.name)"
        >
          <VIcon
            :icon="dataOpen === row.name ? 'mdi-chevron-down' : 'mdi-chevron-right'"
            size="14"
            aria-hidden="true"
          />
          {{ store.project.sources?.[row.name] ? `Data from ${store.project.sources[row.name].url}` : 'Data' }}
        </button>
        <DataSourceFields v-if="dataOpen === row.name" :name="row.name" />

        <button
          v-if="row.elementCount"
          class="variable__toggle text-caption"
          :aria-expanded="expanded === row.name"
          @click="toggle(row.name)"
        >
          <VIcon
            :icon="expanded === row.name ? 'mdi-chevron-down' : 'mdi-chevron-right'"
            size="14"
            aria-hidden="true"
          />
          Where it is used
        </button>
        <ul v-if="expanded === row.name" class="variable__usages">
          <li v-for="(usage, position) in row.usages" :key="`${usage.nodeId}:${usage.kind}:${position}`">
            <button class="variable__usage" :title="`${usage.pageName}: ${usageTitle(usage)}`" @click="goTo(usage)">
              <span class="variable__usage-name">{{ usage.nodeName }}</span>
              <span class="text-medium-emphasis">{{ USAGE_LABELS[usage.kind] }} · {{ usage.pageName }}</span>
            </button>
          </li>
        </ul>
      </li>
    </ul>

    <ComputedVariables />
  </div>
</template>

<style scoped>
.variables-view {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
}
.variables-view__help {
  margin: 0;
}
.variables-view__add {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.variables-view__list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.variable {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 8px;
}
.variable__head {
  display: flex;
  align-items: center;
  gap: 6px;
}
.variable__name {
  font-weight: 600;
  overflow-wrap: anywhere;
}
.variable__toggle {
  display: inline-flex;
  align-items: center;
  align-self: flex-start;
  gap: 2px;
  padding: 2px 0;
  color: rgb(var(--v-theme-primary));
}
.variable__usages {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.variable__usage {
  display: flex;
  width: 100%;
  flex-direction: column;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 12px;
  text-align: left;
}
.variable__usage:hover {
  background: rgba(var(--v-theme-on-surface), 0.06);
}
.variable__usage-name {
  font-weight: 600;
}
</style>
