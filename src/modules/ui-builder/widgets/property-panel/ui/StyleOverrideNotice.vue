<script setup lang="ts">
import { computed } from 'vue'
import { overriddenUtilities, StyleSource, useUiTreeStore, type UiNode } from '../../../entities/ui-node'
import { useOverriddenStyles } from '../model/useOverriddenStyles'

/** Says which Vuetify classes of the element do nothing, because a style sets the same property more strongly. */
const props = defineProps<{ node: UiNode }>()
const store = useUiTreeStore()
const { ownStyle, sharedStyle } = useOverriddenStyles(() => props.node)

const SOURCE_LABELS: Record<StyleSource, string> = {
  [StyleSource.Element]: 'the element’s own style',
  [StyleSource.SharedClass]: 'a style class',
}

const overridden = computed(() => {
  const propClasses = typeof props.node.props.class === 'string' ? props.node.props.class.split(/\s+/) : []
  return overriddenUtilities([...propClasses, ...props.node.classes], ownStyle.value, sharedStyle.value)
})
const sourceText = (sources: StyleSource[]) => sources.map(source => SOURCE_LABELS[source]).join(' and ')
</script>

<template>
  <ul v-if="overridden.length" class="override-notice" :aria-live="store.isPreviewMode ? 'off' : 'polite'">
    <li v-for="item in overridden" :key="item.className">
      <VIcon icon="mdi-alert-outline" size="14" aria-hidden="true" />
      <span>
        <code>{{ item.className }}</code> is overridden by {{ sourceText(item.sources) }}:
        {{ item.properties.join(', ') }}
      </span>
    </li>
  </ul>
</template>

<style scoped>
.override-notice {
  margin: 0 0 8px;
  padding: 0;
  list-style: none;
  font-size: 12px;
}
.override-notice li {
  display: flex;
  gap: 4px;
  color: rgb(var(--v-theme-warning));
}
.override-notice span {
  color: rgba(var(--v-theme-on-surface), 0.8);
  overflow-wrap: anywhere;
}
</style>
