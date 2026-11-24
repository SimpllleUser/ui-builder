<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useMediaQuery } from '@vueuse/core'
import { VueFlow, useVueFlow, type NodeMouseEvent } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { MiniMap } from '@vue-flow/minimap'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/controls/dist/style.css'
import '@vue-flow/minimap/dist/style.css'
import {
  buildOutline,
  isCurrentSection,
  openSection,
  OutlineKind,
  selectInSection,
  useUiTreeStore,
} from '../../../entities/ui-node'
import {
  buildGraph,
  GRAPH_NODE_TYPE,
  GraphDirection,
  SECTION_NODE_PREFIX,
  type StructureGraphNode,
} from '../model/graphLayout'
import GraphNodeCard from './GraphNodeCard.vue'

/** The structure of one page, layout or component as a graph that can be moved and zoomed, with every element a card. */
const open = defineModel<boolean>({ required: true })
const store = useUiTreeStore()

const FIT_PADDING = 0.2
const FIT_DURATION_MS = 250
const MIN_ZOOM = 0.1
const MAX_ZOOM = 2

const SECTION_ICONS: Record<OutlineKind, string> = {
  [OutlineKind.Page]: 'mdi-file-outline',
  [OutlineKind.Layout]: 'mdi-page-layout-header-footer',
  [OutlineKind.Component]: 'mdi-puzzle-outline',
}
const DIRECTIONS = [
  { value: GraphDirection.Vertical, label: 'Top to bottom', icon: 'mdi-arrow-down' },
  { value: GraphDirection.Horizontal, label: 'Left to right', icon: 'mdi-arrow-right' },
]

const sections = computed(() => buildOutline(store.project, store.prefabs))
const sectionId = ref('')
const direction = ref(GraphDirection.Vertical)
const section = computed(() => sections.value.find(item => item.id === sectionId.value) ?? sections.value[0])
const items = computed(() =>
  sections.value.map(item => ({
    title: item.title,
    subtitle: item.detail,
    value: item.id,
    props: { prependIcon: SECTION_ICONS[item.kind] },
  })),
)

// The graph opens on what is being edited, not on what was looked at last time.
// Immediate, because the dialog is only created when the graph is first opened, so `open` is already true then.
watch(
  open,
  isOpen => {
    if (isOpen)
      sectionId.value = (sections.value.find(item => isCurrentSection(store, item)) ?? sections.value[0])?.id ?? ''
  },
  { immediate: true },
)

const graph = computed(() =>
  section.value
    ? buildGraph(section.value, SECTION_ICONS[section.value.kind], direction.value)
    : { nodes: [], edges: [] },
)
const nodes = computed<StructureGraphNode[]>(() =>
  graph.value.nodes.map(node => ({ ...node, selected: store.selectedNodeIds.includes(node.id) })),
)

const { fitView } = useVueFlow()
const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
watch(graph, async () => {
  await nextTick()
  fitView({ padding: FIT_PADDING, duration: reducedMotion.value ? 0 : FIT_DURATION_MS })
})

const onNodeClick = ({ node }: NodeMouseEvent) => {
  const current = section.value
  if (!current) return
  if (node.id.startsWith(SECTION_NODE_PREFIX)) openSection(store, current)
  else selectInSection(store, current, node.id)
}
const miniMapColor = (node: { selected?: boolean }) => (node.selected ? 'rgb(var(--v-theme-primary))' : '#9aa0a6')
</script>

<template>
  <VDialog v-model="open" fullscreen scrollable transition="dialog-bottom-transition">
    <VCard class="graph-dialog" aria-label="Structure graph">
      <VToolbar density="comfortable" class="graph-dialog__bar">
        <VToolbarTitle>Structure graph</VToolbarTitle>
        <VSelect
          :model-value="section?.id"
          :items="items"
          label="Show"
          variant="outlined"
          density="compact"
          hide-details
          class="graph-dialog__select"
          @update:model-value="id => (sectionId = String(id))"
        />
        <VBtnToggle v-model="direction" mandatory density="comfortable" variant="outlined" divided class="mx-3">
          <VBtn
            v-for="option in DIRECTIONS"
            :key="option.value"
            :value="option.value"
            :aria-label="option.label"
            :title="option.label"
          >
            <VIcon :icon="option.icon" />
          </VBtn>
        </VBtnToggle>
        <VBtn icon="mdi-close" aria-label="Close the graph" @click="open = false" />
      </VToolbar>
      <div class="graph-dialog__canvas">
        <VueFlow
          :nodes="nodes"
          :edges="graph.edges"
          :default-edge-options="{ type: 'smoothstep' }"
          :nodes-draggable="false"
          :nodes-connectable="false"
          :elements-selectable="false"
          :min-zoom="MIN_ZOOM"
          :max-zoom="MAX_ZOOM"
          :fit-view-on-init="true"
          :fit-view-params="{ padding: FIT_PADDING }"
          @node-click="onNodeClick"
        >
          <template #[`node-${GRAPH_NODE_TYPE}`]="nodeProps">
            <GraphNodeCard :data="nodeProps.data" :selected="!!nodeProps.selected" />
          </template>
          <Background />
          <MiniMap pannable zoomable :node-color="miniMapColor" />
          <Controls :show-interactive="false" />
        </VueFlow>
      </div>
    </VCard>
  </VDialog>
</template>

<style scoped>
.graph-dialog {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.graph-dialog__bar {
  flex: 0 0 auto;
}
.graph-dialog__select {
  max-width: 280px;
  margin-left: 16px;
}
.graph-dialog__canvas {
  flex: 1;
  min-height: 0;
  background: rgb(var(--v-theme-background));
}
.graph-dialog__canvas :deep(.vue-flow__edge-path) {
  stroke: rgba(var(--v-border-color), 0.6);
  stroke-width: 1.5;
}
.graph-dialog__canvas :deep(.vue-flow__controls-button) {
  background: rgb(var(--v-theme-surface));
  border-color: rgba(var(--v-border-color), 0.3);
  fill: rgb(var(--v-theme-on-surface));
}
.graph-dialog__canvas :deep(.vue-flow__minimap) {
  background: rgb(var(--v-theme-surface));
}
</style>
