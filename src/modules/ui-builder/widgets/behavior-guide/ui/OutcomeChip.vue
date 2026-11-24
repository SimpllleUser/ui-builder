<script setup lang="ts">
import type { PlaygroundOutcome } from '../model/conditionPlayground'
import { OUTCOME_VIEW } from '../model/outcomeView'

defineProps<{ outcome: PlaygroundOutcome }>()
</script>

<template>
  <VChip :color="OUTCOME_VIEW[outcome].color" :prepend-icon="OUTCOME_VIEW[outcome].icon" size="small" label>
    {{ OUTCOME_VIEW[outcome].label }}
  </VChip>
</template>
