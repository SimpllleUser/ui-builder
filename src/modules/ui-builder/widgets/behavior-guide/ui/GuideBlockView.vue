<script setup lang="ts">
import { GuideBlockKind, type GuideBlock } from '../model/guideContent'
import ConditionPlayground from './ConditionPlayground.vue'
import GuideExample from './GuideExample.vue'

defineProps<{ block: GuideBlock }>()
</script>

<template>
  <p v-if="block.kind === GuideBlockKind.Paragraph" class="text-body-1">{{ block.text }}</p>
  <ul v-else-if="block.kind === GuideBlockKind.List" class="guide-list text-body-1">
    <li v-for="item in block.items" :key="item">{{ item }}</li>
  </ul>
  <pre v-else-if="block.kind === GuideBlockKind.Code" class="guide-code">{{ block.text }}</pre>
  <VTable v-else-if="block.kind === GuideBlockKind.Table" density="compact" class="guide-table">
    <thead>
      <tr>
        <th v-for="header in block.headers" :key="header">{{ header }}</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="row in block.rows" :key="row[0]">
        <td v-for="cell in row" :key="cell">{{ cell }}</td>
      </tr>
    </tbody>
  </VTable>
  <GuideExample
    v-else-if="block.kind === GuideBlockKind.Example"
    :condition="block.condition"
    :variables="block.variables"
    :note="block.note"
  />
  <ConditionPlayground v-else />
</template>

<style scoped>
.guide-list {
  margin: 0;
  padding-left: 20px;
}
.guide-list li + li {
  margin-top: 4px;
}
.guide-table td:first-child {
  font-weight: 600;
  white-space: nowrap;
  vertical-align: top;
}
</style>
