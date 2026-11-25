<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { describeBehaviors, overrideTarget, useUiTreeStore, getComponentDef, TEXT_NODE_TYPE } from '../../../entities/ui-node'
import { Icons } from '../../../../../shared/icons'
import { useSettingsGroups } from '../model/useSettingsGroups'
import { useClassEditor } from '../model/useClassEditor'
import {
  defaultTab,
  inspectorTabsFor,
  sectionsForTab,
  INSPECTOR_TABS,
  InspectorTab,
  InspectorTabGroup,
} from '../model/fieldTabs'
import { useMoveDialog, useSavePrefabDialog } from '../model/useNodeDialogs'
import { useDesignTabPreference } from '../model/useDesignTabPreference'
import { useTabScroll } from '../model/useTabScroll'
import EmptyState from '../../../../../shared/ui/EmptyState.vue'
import DesignTab from './design/DesignTab.vue'
import AdvancedProperties from './AdvancedProperties.vue'
import InteractionsEditor from './InteractionsEditor.vue'
import MoveNodeDialog from './MoveNodeDialog.vue'
import MultiSelectSpacing from './MultiSelectSpacing.vue'
import NodePropsEditor from './NodePropsEditor.vue'
import PropertyField from './PropertyField.vue'
import SavePrefabDialog from './SavePrefabDialog.vue'

const store = useUiTreeStore()
const { selectedNodeId, selectedNodeIds } = storeToRefs(store)

const selectedNode = computed(() => {
  if (!selectedNodeId.value || selectedNodeIds.value.length !== 1) return null
  return store.findNodeById(selectedNodeId.value)
})
// The root of a page, the layout or a saved component cannot be deleted or moved.
const isRoot = computed(() => selectedNode.value?.id === store.rootNode.id)
const componentSections = computed(() =>
  selectedNode.value ? (getComponentDef(selectedNode.value.type)?.propertySections ?? []) : [],
)
const textChild = computed(() => selectedNode.value?.children.find(node => node.type === TEXT_NODE_TYPE))
const breadcrumb = computed(() => (selectedNode.value ? store.pathTo(selectedNode.value.id) : []))

// ─── Tabs and groups of settings ─────────────────────────────────────────────
const activeTab = ref<InspectorTab>(InspectorTab.Content)
const designTabEnabled = useDesignTabPreference()
const visibleTabs = computed(() => inspectorTabsFor(selectedNode.value, designTabEnabled.value))
// When the open tab disappears (the Design tab is switched off, or a text element is selected), the usual first tab opens.
watch(visibleTabs, tabs => {
  if (!tabs.some(tab => tab.id === activeTab.value))
    activeTab.value = defaultTab(selectedNode.value, componentSections.value)
})
const activeTabInfo = computed(() => INSPECTOR_TABS.find(tab => tab.id === activeTab.value))
// The Behavior tab says how many behaviors the element has, so logic is not hidden behind a tab nobody opens.
const behaviorCount = computed(() => (selectedNode.value ? describeBehaviors(selectedNode.value).length : 0))
const tabBadge = (tab: InspectorTab) => (tab === InspectorTab.Behavior ? behaviorCount.value : 0)
const startsMoreGroup = (index: number) =>
  visibleTabs.value[index].group === InspectorTabGroup.More &&
  visibleTabs.value[index - 1]?.group !== InspectorTabGroup.More
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

const panel = ref<HTMLElement>()
useTabScroll(panel, activeTab, selectedNodeId)

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
  <div ref="panel" class="property-panel">
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
      <VDivider class="mb-2" />

      <div class="inspector">
        <!-- Vertical icon rail like the tool strips of design tools; the name shows on hover and for screen readers. -->
        <nav
          v-if="!query"
          class="inspector__rail"
          role="tablist"
          aria-orientation="vertical"
          aria-label="Property groups"
        >
          <template v-for="(tab, index) in visibleTabs" :key="tab.id">
            <hr v-if="startsMoreGroup(index)" class="inspector__divider" aria-hidden="true" />
            <button
              type="button"
              role="tab"
              class="inspector__tab"
              :class="{ 'inspector__tab--active': tab.id === activeTab }"
              :aria-selected="tab.id === activeTab"
              :aria-label="tabBadge(tab.id) ? `${tab.label}, ${tabBadge(tab.id)} set` : tab.label"
              :title="tab.description"
              @click="activeTab = tab.id"
            >
              <VIcon :icon="tab.icon" size="20" aria-hidden="true" />
              <span class="inspector__tab-label" aria-hidden="true">{{ tab.label }}</span>
              <span v-if="tabBadge(tab.id)" class="inspector__badge" aria-hidden="true">{{ tabBadge(tab.id) }}</span>
            </button>
          </template>
        </nav>

        <div class="inspector__body">
          <template v-if="!query && activeTabInfo">
            <div class="inspector__title">{{ activeTabInfo.label }}</div>
            <p class="inspector__description">{{ activeTabInfo.description }}</p>
          </template>

          <p
            v-if="overrideTarget(store.editingBreakpoint) && !showsDesign"
            class="text-caption text-medium-emphasis mt-2"
          >
            Per-size styles are in the Design tab. Settings here apply to every size, except a column's SM–XL widths.
          </p>
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
                    activeTab !== InspectorTab.Behavior &&
                    activeTab !== InspectorTab.Json &&
                    !showsDesign &&
                    !(activeTab === InspectorTab.Content && textChild)))
              "
              class="text-body-2 text-medium-emphasis"
            >
              {{
                query
                  ? `No settings match “${settingsQuery}”.`
                  : `No ${activeTabInfo?.label.toLowerCase()} settings for this element.`
              }}
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
          <NodePropsEditor v-if="!query && activeTab === InspectorTab.Json" :node="selectedNode" />

          <InteractionsEditor
            v-if="!query && activeTab === InspectorTab.Behavior && selectedNode.type !== TEXT_NODE_TYPE"
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
      </div>
    </div>

    <EmptyState
      v-else
      :icon="Icons.CursorClick"
      title="Nothing selected"
      description="Click an element on the canvas or in Layers to edit it here. Shift-click selects several at once."
      class="mt-10"
    />
    <SavePrefabDialog
      v-model="prefabDialog.open.value"
      :name="prefabDialog.name.value"
      :prop-names="prefabDialog.propNames.value"
      :defaults="prefabDialog.defaults.value"
      @update:name="prefabDialog.name.value = $event"
      @update:default="(propName, value) => (prefabDialog.defaults.value[propName] = value)"
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
  font-size: 12px;
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
.inspector {
  display: flex;
  gap: 8px;
}
.inspector__rail {
  position: sticky;
  top: 0;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  gap: 2px;
  align-self: flex-start;
  padding-right: 6px;
  border-right: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.inspector__tab {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  width: 56px;
  min-height: 44px;
  padding: 4px 0;
  border-radius: 6px;
  color: rgba(var(--v-theme-on-surface), 0.6);
  transition:
    background 0.1s,
    color 0.1s;
}
.inspector__tab:hover {
  background: rgba(var(--v-theme-on-surface), 0.08);
  color: rgb(var(--v-theme-on-surface));
}
.inspector__tab-label {
  font-size: 12px;
  line-height: 1.1;
}
.inspector__badge {
  position: absolute;
  top: 2px;
  right: 6px;
  min-width: 16px;
  padding: 0 4px;
  border-radius: 8px;
  background: rgb(var(--v-theme-info));
  color: rgb(var(--v-theme-on-info));
  font-size: 12px;
  font-weight: 700;
  line-height: 16px;
  text-align: center;
}
.inspector__divider {
  width: 70%;
  margin: 6px auto;
  border: 0;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.inspector__description {
  margin: -4px 0 8px;
  color: rgba(var(--v-theme-on-surface), 0.7);
  font-size: 12px;
}
.inspector__tab--active {
  background: rgba(var(--v-theme-primary), 0.14);
  color: rgb(var(--v-theme-primary));
}
.inspector__tab--active::before {
  content: '';
  position: absolute;
  left: -7px;
  top: 6px;
  bottom: 6px;
  width: 2px;
  border-radius: 2px;
  background: rgb(var(--v-theme-primary));
}
.inspector__body {
  flex: 1;
  min-width: 0;
}
.inspector__title {
  margin-bottom: 8px;
  color: rgba(var(--v-theme-on-surface), 0.7);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
</style>
