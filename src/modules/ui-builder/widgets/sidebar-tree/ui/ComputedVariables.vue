<script setup lang="ts">
import { computed, ref } from 'vue'
import { formulaError, useUiTreeStore, valueToText, variableNameError } from '../../../entities/ui-node'
import { useCheckedDrafts } from '../../../../../shared/lib/useCheckedDrafts'

/** Variables worked out from others, such as `total = length(rows)`. */
const store = useUiTreeStore()

const rows = computed(() =>
  Object.entries(store.project.computed ?? {}).map(([name, formula]) => ({
    name,
    formula,
    value: valueToText(store.startingState[name]),
  })),
)

const newName = ref('')
const newFormula = ref('')
const nameProblem = computed(() => {
  const name = newName.value.trim()
  if (!name) return null
  const taken = name in store.project.state || name in (store.project.computed ?? {})
  return variableNameError(name) ?? (taken ? 'A variable with this name already exists.' : null)
})
const formulaProblem = computed(() =>
  newFormula.value.trim() ? formulaError(newName.value.trim(), newFormula.value, store.project.computed) : null,
)
const add = () => {
  const name = newName.value.trim()
  if (!name || !newFormula.value.trim() || nameProblem.value || formulaProblem.value) return
  if (store.setComputed(name, newFormula.value)) {
    newName.value = ''
    newFormula.value = ''
  }
}

// An expression is applied when the person leaves the field; one that cannot be used stays with the reason.
const drafts = useCheckedDrafts(
  (name, text) => formulaError(name, text, store.project.computed),
  (name, text) => store.setComputed(name, text),
)
</script>

<template>
  <section class="computed" aria-label="Computed variables">
    <div class="text-overline">Computed</div>
    <div v-for="row in rows" :key="row.name" class="computed__row">
      <div class="computed__head">
        <code>{{ row.name }}</code>
        <span class="text-caption text-medium-emphasis computed__value">= {{ row.value }}</span>
        <VBtn
          icon="mdi-delete-outline"
          size="x-small"
          variant="text"
          color="error"
          :aria-label="`Delete ${row.name}`"
          @click="store.setComputed(row.name, null)"
        />
      </div>
      <VTextField
        :model-value="drafts.shown(row.name, row.formula)"
        :label="`Expression of ${row.name}`"
        :error-messages="drafts.errorOf(row.name)"
        variant="outlined"
        density="compact"
        hide-details="auto"
        spellcheck="false"
        @update:model-value="text => drafts.edit(row.name, text)"
        @blur="drafts.commit(row.name)"
        @keydown.enter="drafts.commit(row.name)"
      />
    </div>
    <form class="computed__add" @submit.prevent="add">
      <VTextField
        v-model="newName"
        label="Computed variable"
        placeholder="total"
        :error-messages="nameProblem ?? []"
        variant="outlined"
        density="compact"
        hide-details="auto"
        spellcheck="false"
      />
      <VTextField
        v-model="newFormula"
        label="Expression"
        placeholder="length(rows)"
        :error-messages="formulaProblem ?? []"
        variant="outlined"
        density="compact"
        hide-details="auto"
        spellcheck="false"
      />
      <VBtn type="submit" color="primary" variant="tonal" size="small" prepend-icon="mdi-plus">Add computed</VBtn>
    </form>
  </section>
</template>

<style scoped>
.computed,
.computed__add,
.computed__row {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.computed__head {
  display: flex;
  align-items: center;
  gap: 6px;
}
.computed__value {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
