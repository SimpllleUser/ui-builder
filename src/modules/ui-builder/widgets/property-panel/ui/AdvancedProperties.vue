<script setup lang="ts">
import type { UiNode } from '../../../entities/ui-node/model/types'

defineProps<{
  node: UiNode
  classSearch: string
  filteredGroups: Array<{ title: string; classes: string[] }>
}>()

const emit = defineEmits<{
  'update:classSearch': [value: string]
  'toggle-class': [value: string]
  'add-custom-class': []
}>()
</script>

<template>
  <div class="advanced-properties">
    <div class="text-caption mb-4">Component: {{ node.type }}<br />ID: {{ node.id }}</div>
    <div class="mb-2 text-overline text-primary font-weight-bold">Custom Classes</div>

    <div v-if="node.classes.length" class="applied-chips mb-2">
      <VChip
        v-for="className in node.classes"
        :key="className"
        size="small"
        closable
        color="primary"
        variant="tonal"
        class="ma-1"
        @click:close="emit('toggle-class', className)"
      >{{ className }}</VChip>
    </div>
    <div v-else class="text-caption text-medium-emphasis mb-2">No classes applied</div>

    <VTextField
      :model-value="classSearch"
      label="Search or add CSS classes"
      placeholder="Search or type class name…"
      variant="outlined"
      density="compact"
      hide-details
      clearable
      class="mb-2"
      prepend-inner-icon="mdi-magnify"
      @update:model-value="emit('update:classSearch', $event)"
      @keydown.enter.prevent="emit('add-custom-class')"
    />

    <div class="preset-groups">
      <div v-for="group in filteredGroups" :key="group.title" class="preset-group">
        <div class="preset-group__title">{{ group.title }}</div>
        <div class="preset-group__chips">
          <VChip
            v-for="className in group.classes"
            :key="className"
            size="small"
            :variant="node.classes.includes(className) ? 'flat' : 'tonal'"
            :color="node.classes.includes(className) ? 'primary' : 'default'"
            class="preset-chip"
            @click="emit('toggle-class', className)"
          >{{ className }}</VChip>
        </div>
      </div>
      <div v-if="filteredGroups.length === 0" class="text-caption text-medium-emphasis text-center py-4">
        No matches — press Enter to add "{{ classSearch }}"
      </div>
    </div>
  </div>
</template>

<style scoped>
.applied-chips { display: flex; flex-wrap: wrap; gap: 2px; }
.preset-groups { max-height: 260px; overflow-y: auto; border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity)); border-radius: 8px; padding: 6px 8px; }
.preset-group + .preset-group { margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(var(--v-border-color), calc(var(--v-border-opacity) * 0.5)); }
.preset-group__title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; opacity: 0.8; margin-bottom: 4px; }
.preset-group__chips { display: flex; flex-wrap: wrap; gap: 3px; }
.preset-chip { cursor: pointer; font-size: 12px !important; transition: all 0.12s; }
</style>
