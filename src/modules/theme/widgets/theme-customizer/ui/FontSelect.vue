<script setup lang="ts">
import type { FontFamily } from '../../../entities/theme-settings'
import { FONT_OPTIONS } from '../model/options'

defineProps<{ label: string }>()
const selected = defineModel<FontFamily>({ required: true })
</script>

<template>
  <VSelect v-model="selected" :items="FONT_OPTIONS" :label="label" variant="outlined" density="compact" hide-details>
    <template #item="{ item, props: itemProps }">
      <VListItem v-bind="itemProps" :style="{ fontFamily: item.raw.stack }" />
    </template>
  </VSelect>
</template>
