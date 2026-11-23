<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useUiTreeStore, getComponentDef, ROOT_NODE_ID, TEXT_NODE_TYPE } from '../../../entities/ui-node'
import { Icons } from '../../../../../shared/icons'
import { useSettingsGroups } from '../model/useSettingsGroups'
import { useClassEditor } from '../model/useClassEditor'
import { defaultTab, sectionsForTab, InspectorTab } from '../model/fieldTabs'
import { useMoveDialog, useSavePrefabDialog } from '../model/useNodeDialogs'
import { useDesignTabPreference } from '../model/useDesignTabPreference'
import DesignTab from './design/DesignTab.vue'
import AdvancedProperties from './AdvancedProperties.vue'
import InteractionsEditor from './InteractionsEditor.vue'
import MoveNodeDialog from './MoveNodeDialog.vue'
import MultiSelectSpacing from './MultiSelectSpacing.vue'
import PropertyField from './PropertyField.vue'
import SavePrefabDialog from './SavePrefabDialog.vue'

const store = useUiTreeStore()
const { selectedNodeId, selectedNodeIds } = storeToRefs(store)

const selectedNode = computed(() => {
  if (!selectedNodeId.value || selectedNodeIds.value.length !== 1) return null
  return store.findNodeById(selectedNodeId.value)
})
const isRoot = computed(() => selectedNode.value?.id === ROOT_NODE_ID)
const componentSections = computed(() =>
  selectedNode.value ? (getComponentDef(selectedNode.value.type)?.propertySections ?? []) : [],
)
const textChild = computed(() => selectedNode.value?.children.find(node => node.type === TEXT_NODE_TYPE))
const breadcrumb = computed(() => (selectedNode.value ? store.pathTo(selectedNode.value.id) : []))

// ─── Tabs and groups of settings ─────────────────────────────────────────────
const activeTab = ref<InspectorTab>(InspectorTab.Content)
const designTabEnabled = useDesignTabPreference()
const showDesignTab = computed(() => designTabEnabled.value && selectedNode.value?.type !== TEXT_NODE_TYPE)
// Switching the Design tab off while it is open returns to the usual first tab.
watch(showDesignTab, shown => {
  if (!shown && activeTab.value === InspectorTab.Design)
    activeTab.value = defaultTab(selectedNode.value, componentSections.value)
})
const showsDesign = computed(() => !query.value && activeTab.value === InspectorTab.Design)
const tabSections = computed(() => sectionsForTab(componentSections.value, activeTab.value))
const {
  searchText: settingsQuery,
  searchable,
  query,
  visibleSections,
  isOpen: isSectionOpen,
  toggle: toggleSection,
  clearSearch,
} = useSettingsGroups(selectedNode, tabSections)
watch(
  selectedNodeId,
  () => {
    clearSearch()
    activeTab.value = defaultTab(selectedNode.value, componentSections.value)
  },
  { immediate: true },
)

// ─── The rest of the panel ───────────────────────────────────────────────────
const { classSearch, filteredGroups, toggleClass, addCustomClass } = useClassEditor(selectedNode, (id, classes) =>
  store.updateNodeClasses(id, classes),
)
const prefabDialog = useSavePrefabDialog(store, selectedNode)
const moveDialog = useMoveDialog(store, selectedNode)
const updateName = (value: string) => selectedNode.value && store.updateNodeName(selectedNode.value.id, value)
const updateText = (value: string) => textChild.value && store.updateNodeName(textChild.value.id, value)
const fieldKey = (field: { kind: string; prop?: string }) => field.kind + (field.prop ?? '')
</script>

<template>
  <div class="property-panel">
    <MultiSelectSpacing v-if="selectedNodeIds.length > 1" />
    <div v-else-if="selectedNode" :key="selectedNode.id" class="pa-4">
      <div class="d-flex align-center justify-space-between mb-1">
        <div class="text-subtitle-1 font-weight-bold">
          {{ getComponentDef(selectedNode.type)?.label ?? selectedNode.type }}
        </div>
        <div v-if="!isRoot" class="d-flex align-center">
          <VBtn
            icon="mdi-content-save-outline"
            aria-label="Save to My components"
            title="Save to My components"
            variant="text"
            size="small"
            @click="prefabDialog.show"
          />
          <VBtn
            :icon="Icons.DeleteOutline"
            aria-label="Delete element"
            title="Delete element"
            variant="text"
            color="error"
            size="small"
            @click="store.deleteNode(selectedNode.id)"
          />
        </div>
      </div>
      <nav aria-label="Element path" class="element-path">
        <button v-for="node in breadcrumb" :key="node.id" @click="store.selectNode(node.id)">
          {{ store.nodeLabel(node) }}
        </button>
      </nav>
      <VTextField
        v-if="selectedNode.type !== TEXT_NODE_TYPE"
        :model-value="store.nodeLabel(selectedNode)"
        label="Element name"
        variant="outlined"
        density="compact"
        hide-details
        class="my-3"
        @update:model-value="updateName"
        @blur="store.commit()"
      />
      <VBtn
        v-if="!isRoot"
        variant="text"
        size="small"
        prepend-icon="mdi-folder-move-outline"
        class="mb-2"
        @click="moveDialog.show"
        >Move to…</VBtn
      >
      <VTextField
        v-if="searchable"
        v-model="settingsQuery"
        label="Search settings"
        prepend-inner-icon="mdi-magnify"
        variant="outlined"
        density="compact"
        hide-details
        clearable
        class="mb-2"
      />
      <VTabs v-if="!query" v-model="activeTab" density="compact" class="property-tabs"
        ><VTab :value="InspectorTab.Content">Content</VTab><VTab :value="InspectorTab.Layout">Layout</VTab
        ><VTab :value="InspectorTab.Appearance">Style</VTab><VTab :value="InspectorTab.Advanced">Advanced</VTab
        ><VTab v-if="showDesignTab" :value="InspectorTab.Design">Design</VTab></VTabs
      >

      <VDivider class="mb-4" />

      <div class="pt-4">
        <VTextarea
          v-if="!query && activeTab === InspectorTab.Content && textChild"
          :model-value="textChild.name"
          label="Text content"
          variant="outlined"
          density="compact"
          auto-grow
          rows="2"
          class="mb-4"
          hide-details
          @update:model-value="updateText"
        />
        <p
          v-if="
            !visibleSections.length &&
            (query ||
              (activeTab !== InspectorTab.Advanced &&
                !showsDesign &&
                !(activeTab === InspectorTab.Content && textChild)))
          "
          class="text-body-2 text-medium-emphasis"
        >
          {{ query ? `No settings match “${settingsQuery}”.` : `No ${activeTab} settings for this element.` }}
        </p>
        <template v-for="section in visibleSections" :key="section.title">
          <div class="mb-4">
            <button
              v-if="section.title"
              type="button"
              class="section-toggle"
              :aria-expanded="isSectionOpen(section)"
              @click="toggleSection(section)"
            >
              <VIcon
                :icon="isSectionOpen(section) ? 'mdi-chevron-down' : 'mdi-chevron-right'"
                size="18"
                aria-hidden="true"
              />
              <span>{{ section.title }}</span>
              <span class="section-toggle__count">{{ section.fields.length }}</span>
            </button>

            <div v-show="isSectionOpen(section)" class="section-body">
              <PropertyField
                v-for="field in section.fields"
                :key="fieldKey(field)"
                :node="selectedNode"
                :field="field"
              />
            </div>
          </div>
        </template>
      </div>

      <DesignTab v-if="showsDesign && selectedNode" :node="selectedNode" />

      <!-- Behavior first: it is used far more often than the long list of CSS classes below it. -->
      <InteractionsEditor
        v-if="!query && activeTab === InspectorTab.Advanced && selectedNode.type !== TEXT_NODE_TYPE"
        :node="selectedNode"
      />
      <AdvancedProperties
        v-if="!query && activeTab === InspectorTab.Advanced"
        :node="selectedNode"
        :class-search="classSearch"
        :filtered-groups="filteredGroups"
        @update:class-search="classSearch = $event"
        @toggle-class="toggleClass"
        @add-custom-class="addCustomClass"
      />
    </div>

    <div v-else class="pa-10 text-center text-medium-emphasis mt-10">
      <VIcon :icon="Icons.CursorClick" size="x-large" class="mb-4 opacity-20" />
      <div class="text-body-2">Select an element to edit properties</div>
    </div>
    <SavePrefabDialog
      v-model="prefabDialog.open.value"
      :name="prefabDialog.name.value"
      @update:name="prefabDialog.name.value = $event"
      @save="prefabDialog.save"
    />
    <MoveNodeDialog
      v-model="moveDialog.open.value"
      :target="moveDialog.target.value"
      :targets="moveDialog.targets.value"
      @update:target="moveDialog.target.value = $event"
      @move="moveDialog.move"
    />
  </div>
</template>

<style scoped>
.property-panel {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}
.section-toggle {
  display: flex;
  align-items: center;
  gap: 4px;
  width: 100%;
  margin-bottom: 6px;
  padding: 4px 0;
  color: rgb(var(--v-theme-primary));
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-align: left;
  text-transform: uppercase;
}
.section-toggle__count {
  margin-left: auto;
  padding: 0 6px;
  border-radius: 8px;
  background: rgba(var(--v-theme-primary), 0.12);
  font-size: 11px;
}
.section-body {
  padding-left: 4px;
}
.element-path {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-block: 8px;
}
.element-path button {
  font-size: 12px;
  min-height: 28px;
  color: rgb(var(--v-theme-primary));
  overflow-wrap: anywhere;
  text-align: left;
}
.element-path button + button::before {
  content: '/';
  padding-right: 4px;
}
.property-tabs :deep(.v-tab) {
  min-width: 0;
  padding-inline: 10px;
  font-size: 12px;
  text-transform: none;
}
</style>
