<script setup lang="ts">
import { computed } from 'vue'
import { evaluateSample } from '../model/conditionPlayground'
import OutcomeChip from './OutcomeChip.vue'

const props = defineProps<{ condition: string; variables: Record<string, unknown>; note: string }>()
// The same evaluator Preview uses, so an example can never disagree with the editor.
const result = computed(() => evaluateSample(props.condition, props.variables))
</script>

<template>
  <div class="guide-example">
    <code class="guide-code guide-example__condition">{{ condition }}</code>
    <div class="guide-example__row">
      <span class="text-caption text-medium-emphasis">with {{ JSON.stringify(variables) }}</span>
      <OutcomeChip :outcome="result.outcome" />
    </div>
    <div class="text-body-2">{{ note }}</div>
  </div>
</template>

<style scoped>
.guide-example {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 8px;
}
.guide-example__row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
</style>
