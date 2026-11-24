<script setup lang="ts">
import { computed, ref } from 'vue'
import { useClipboard } from '@vueuse/core'
import {
  buildOutline,
  isCurrentSection,
  OutlineKind,
  openSection,
  selectInSection,
  outlineToTextAll,
  useUiTreeStore,
  type OutlineSection,
} from '../../../entities/ui-node'
import EmptyState from '../../../../../shared/ui/EmptyState.vue'
import StructureNode from './StructureNode.vue'

/** The whole project as one plain tree: pages, the shared layout and saved components, each a folder of elements. */
const emit = defineEmits<{ openGraph: [] }>()
const store = useUiTreeStore()
const COPIED_MESSAGE_MS = 2000
const { copy, copied } = useClipboard({ copiedDuring: COPIED_MESSAGE_MS })

const sections = computed(() => buildOutline(store.project, store.prefabs))
const folded = ref<Set<string>>(new Set())

const SECTION_ICONS: Record<OutlineKind, string> = {
  [OutlineKind.Page]: 'mdi-file-outline',
  [OutlineKind.Layout]: 'mdi-page-layout-header-footer',
  [OutlineKind.Component]: 'mdi-puzzle-outline',
}

const isCurrent = (section: OutlineSection) => isCurrentSection(store, section)

const toggle = (id: string) => {
  const next = new Set(folded.value)
  if (!next.delete(id)) next.add(id)
  folded.value = next
}

const open = (section: OutlineSection) => openSection(store, section)
const select = (section: OutlineSection, nodeId: string) => selectInSection(store, section, nodeId)
</script>

<template>
  <div class="sidebar-view__scroll structure">
    <div class="structure__bar">
      <span class="text-caption text-medium-emphasis">Click an element to select it</span>
      <span class="structure__actions">
        <VBtn
          icon="mdi-graph-outline"
          size="x-small"
          variant="text"
          aria-label="Open the structure as a graph"
          title="Open the structure as a graph"
          @click="emit('openGraph')"
        />
        <VBtn
          :icon="copied ? 'mdi-check' : 'mdi-content-copy'"
          size="x-small"
          variant="text"
          aria-label="Copy the structure as text"
          title="Copy the structure as text"
          @click="copy(outlineToTextAll(sections))"
        />
      </span>
    </div>

    <EmptyState
      v-if="!sections.length"
      icon="mdi-sitemap-outline"
      title="No structure yet"
      description="Add a page and some components, and their structure appears here."
    />

    <ul class="structure__list">
      <li v-for="section in sections" :key="section.id">
        <div class="section" :class="{ 'section--current': isCurrent(section) }">
          <button
            class="section__toggle"
            :aria-expanded="!folded.has(section.id)"
            :aria-label="`${folded.has(section.id) ? 'Expand' : 'Collapse'} ${section.title}`"
            @click="toggle(section.id)"
          >
            <VIcon
              :icon="folded.has(section.id) ? 'mdi-chevron-right' : 'mdi-chevron-down'"
              size="16"
              aria-hidden="true"
            />
          </button>
          <button class="section__name" :title="`Open ${section.title}`" @click="open(section)">
            <VIcon :icon="SECTION_ICONS[section.kind]" size="16" aria-hidden="true" />
            <span class="section__text">{{ section.title }}</span>
          </button>
        </div>
        <template v-if="!folded.has(section.id)">
          <ul v-if="section.roots.length" class="section__tree">
            <StructureNode
              v-for="node in section.roots"
              :key="node.id"
              :node="node"
              :depth="0"
              :selected-ids="store.selectedNodeIds"
              @select="select(section, $event)"
            />
          </ul>
          <p v-else class="section__empty text-caption text-medium-emphasis">Empty</p>
        </template>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.structure {
  padding: 8px;
}
.structure__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 4px 6px;
}
.structure__list {
  margin: 0;
  padding: 0;
  list-style: none;
}
.structure__list > li + li {
  margin-top: 6px;
}
.section {
  display: flex;
  align-items: center;
  min-height: 30px;
  border-radius: 6px;
}
.section__toggle {
  display: inline-flex;
  width: 20px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
}
.section__name {
  display: flex;
  min-width: 0;
  flex: 1;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  text-align: left;
}
.section--current .section__name {
  color: rgb(var(--v-theme-primary));
}
.section__text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.section__tree {
  margin: 0 0 0 10px;
  padding: 0;
}
.section__empty {
  margin: 2px 0 0 30px;
}
</style>
