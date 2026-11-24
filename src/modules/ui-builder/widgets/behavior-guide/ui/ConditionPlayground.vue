<script setup lang="ts">
import { computed, ref } from 'vue'
import { evaluateSample, parseVariables } from '../model/conditionPlayground'
import OutcomeChip from './OutcomeChip.vue'

const DEFAULT_CONDITION = 'age >= 18 and role == "admin"'
const DEFAULT_VARIABLES = '{\n  "age": 20,\n  "role": "admin",\n  "tags": ["new"]\n}'

const condition = ref(DEFAULT_CONDITION)
const variablesJson = ref(DEFAULT_VARIABLES)
const variables = computed(() => parseVariables(variablesJson.value))
const result = computed(() => evaluateSample(condition.value, variables.value.scope))
</script>

<template>
  <div class="playground">
    <VTextField
      v-model="condition"
      label="Condition"
      variant="outlined"
      density="compact"
      :error-messages="result.problem ?? undefined"
      hide-details="auto"
      spellcheck="false"
    />
    <VTextarea
      v-model="variablesJson"
      label="Variables (JSON)"
      variant="outlined"
      density="compact"
      rows="5"
      auto-grow
      :error-messages="variables.problem ?? undefined"
      hide-details="auto"
      spellcheck="false"
    />
    <div class="d-flex align-center ga-2">
      <span class="text-body-2">The element is</span>
      <OutcomeChip :outcome="result.outcome" />
    </div>
  </div>
</template>

<style scoped>
.playground {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 8px;
}
</style>
