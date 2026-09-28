<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useUiTreeStore } from '../../../entities/ui-node/model/store'
import { getComponentDef, type PropField } from '../../../entities/ui-node/model/componentDefinitions'
import { ROOT_NODE_ID, TEXT_NODE_TYPE } from '../../../entities/ui-node/model/constants'
import type { UiNode } from '../../../entities/ui-node/model/types'
import { Icons } from '../../../../../shared/icons'
import { useClassEditor } from '../model/useClassEditor'
import { useSpacingEditor } from '../model/useSpacingEditor'
import { useStyleEditor } from '../model/useStyleEditor'
import AdvancedProperties from './AdvancedProperties.vue'
import MoveNodeDialog from './MoveNodeDialog.vue'
import SavePrefabDialog from './SavePrefabDialog.vue'

const store = useUiTreeStore()
const { selectedNodeId, selectedNodeIds } = storeToRefs(store)

const selectedNode = computed(() => {
  if (!selectedNodeId.value || selectedNodeIds.value.length !== 1) return null
  return store.findNodeById(selectedNodeId.value)
})
const { classSearch, filteredGroups, toggleClass, addCustomClass } = useClassEditor(
  selectedNode,
  (id, classes) => store.updateNodeClasses(id, classes),
)
const { activeSpacingType, spacingSides, spacingSizes, commonSpacing, updateCommonSpacing, updateSpacing, getSpacingValue } = useSpacingEditor(
  selectedNode,
  selectedNodeIds,
  id => store.findNodeById(id),
  (id, classes) => store.updateNodeClasses(id, classes),
  () => store.commit(),
)
const { flexOptions, fontWeights, getFlexValue, setFlexValue, getJustifyValue, setJustifyValue, getFontWeight, setFontWeight, getTextAlign, setTextAlign } = useStyleEditor(
  selectedNode,
  (id, classes) => store.updateNodeClasses(id, classes),
)

const isRoot = computed(() => selectedNode.value?.id === ROOT_NODE_ID)

const activeTab = ref('content')
const fieldTab = (field: PropField, title: string) => {
  if (field.kind === 'custom-classes') return 'advanced'
  if (['spacing', 'flex-layout', 'row'].includes(field.kind) || ['Layout', 'Grid Column'].includes(title)) return 'layout'
  if (field.kind === 'textarea' || (field.kind === 'text' && ['title', 'subtitle', 'label', 'placeholder', 'hint', 'src', 'alt', 'image', 'value'].includes(field.prop))) return 'content'
  return 'appearance'
}
const activeSections = computed(() => (selectedNode.value ? getComponentDef(selectedNode.value.type)?.propertySections ?? [] : [])
  .map(section => ({ ...section, fields: section.fields.filter(field => field.kind !== 'custom-classes' && fieldTab(field, section.title ?? '') === activeTab.value) }))
  .filter(section => section.fields.length))
const textChild = computed(() => selectedNode.value?.children.find(node => node.type === TEXT_NODE_TYPE))
const breadcrumb = computed(() => selectedNode.value ? store.pathTo(selectedNode.value.id) : [])
const saveDialog = ref(false)
const prefabName = ref('')
const onSavePrefab = () => { prefabName.value = selectedNode.value?.name ?? ''; saveDialog.value = true }
const savePrefab = () => { if (selectedNode.value && prefabName.value.trim()) { store.savePrefab(selectedNode.value.id, prefabName.value); saveDialog.value = false } }
const moveDialog = ref(false)
const moveTarget = ref('')
const moveTargets = computed(() => {
  const result: { title: string; value: string }[] = []
  const visit = (node: UiNode, path: string[]) => {
    if (node.id === selectedNodeId.value) return
    const names = [...path, node.name]
    if (store.canContain(node)) result.push({ title: names.join(' / '), value: JSON.stringify([node.id, null]) })
    for (const slot of getComponentDef(node.type)?.slots ?? []) {
      if (node.id !== ROOT_NODE_ID && slot.name !== 'default') result.push({ title: `${names.join(' / ')} / ${slot.label}`, value: JSON.stringify([node.id, slot.name]) })
    }
    for (const child of [...node.children, ...Object.values(node.slots).flat()]) visit(child, names)
  }
  visit(store.rootNode, [])
  return result
})
const moveSelected = () => {
  if (!selectedNodeId.value || !moveTarget.value) return
  const [parentId, slot] = JSON.parse(moveTarget.value)
  if (store.moveNode(selectedNodeId.value, parentId, slot)) moveDialog.value = false
}
watch(selectedNodeId, () => {
  activeSpacingType.value = 'm'
  const node = selectedNode.value
  const sections = node ? getComponentDef(node.type)?.propertySections ?? [] : []
  if (node?.children.some(child => child.type === TEXT_NODE_TYPE) || sections.some(s => s.fields.some(f => fieldTab(f, s.title ?? '') === 'content'))) activeTab.value = 'content'
  else if (sections.some(s => s.fields.some(f => fieldTab(f, s.title ?? '') === 'layout'))) activeTab.value = 'layout'
  else activeTab.value = 'appearance'
}, { immediate: true })

const getStringProp = (prop: string) => {
  const value = selectedNode.value?.props[prop]
  return typeof value === 'string' ? value : null
}

const getNumberProp = (prop: string) => {
  const value = selectedNode.value?.props[prop]
  return typeof value === 'number' ? value : 0
}

const getBooleanProp = (prop: string) => selectedNode.value?.props[prop] === true
const updateProp = (prop: string, value: unknown) => {
  if (selectedNode.value) store.updateNodeProp(selectedNode.value.id, prop, value)
}
const updateSelectedName = (value: string) => {
  if (selectedNode.value) store.updateNodeName(selectedNode.value.id, value)
}
const updateTextChild = (value: string) => {
  if (textChild.value) store.updateNodeName(textChild.value.id, value)
}

const allIcons = Object.entries(Icons).map(([name, value]) => ({ name, value }))

const fieldKey = (field: PropField) =>
  field.kind + ('prop' in field ? (field as any).prop : '')

</script>

<template>
  <div class="property-panel">
    <section v-if="selectedNodeIds.length > 1" class="pa-4">
      <h2 class="text-subtitle-1 font-weight-bold">{{ selectedNodeIds.length }} elements selected</h2>
      <p class="text-body-2 my-3">Shared spacing applies to every selected element. Select one layer to edit its content and appearance.</p>
      <VBtnToggle v-model="activeSpacingType" mandatory density="compact" color="primary" variant="outlined" class="mb-4"><VBtn value="m">Margin</VBtn><VBtn value="p">Padding</VBtn></VBtnToggle>
      <VSelect v-for="side in spacingSides" :key="side.value" :label="side.label" :items="spacingSizes" :model-value="commonSpacing(side.value)" variant="outlined" density="compact" hide-details class="mb-3" @update:model-value="value => updateCommonSpacing(side.value, value)" />
    </section>
    <div v-else-if="selectedNode" :key="selectedNode.id" class="pa-4">

      <div class="d-flex align-center justify-space-between mb-1">
        <div class="text-subtitle-1 font-weight-bold">{{ getComponentDef(selectedNode.type)?.label ?? selectedNode.type }}</div>
        <div v-if="!isRoot" class="d-flex align-center">
          <VBtn
            icon="mdi-content-save-outline"
            aria-label="Save to My components" title="Save to My components"
            variant="text"
            size="small"
            @click="onSavePrefab"
          />
          <VBtn
            :icon="Icons.DeleteOutline"
            aria-label="Delete element" title="Delete element"
            variant="text"
            color="error"
            size="small"
            @click="store.deleteNode(selectedNode.id)"
          />
        </div>
      </div>
      <nav aria-label="Element path" class="element-path"><button v-for="node in breadcrumb" :key="node.id" @click="store.selectNode(node.id)">{{ node.name }}</button></nav>
      <VTextField v-if="selectedNode.type !== TEXT_NODE_TYPE" :model-value="selectedNode.name" @update:model-value="updateSelectedName" label="Element name" variant="outlined" density="compact" hide-details class="my-3" @blur="store.commit()" />
      <VBtn v-if="!isRoot" variant="text" size="small" prepend-icon="mdi-folder-move-outline" class="mb-2" @click="moveTarget = ''; moveDialog = true">Move to…</VBtn>
      <VTabs v-model="activeTab" density="compact" class="property-tabs"><VTab value="content">Content</VTab><VTab value="layout">Layout</VTab><VTab value="appearance">Style</VTab><VTab value="advanced">Advanced</VTab></VTabs>

      <VDivider class="mb-4" />

      <div class="pt-4">
        <VTextarea v-if="activeTab === 'content' && textChild" :model-value="textChild.name" @update:model-value="updateTextChild" label="Text content" variant="outlined" density="compact" auto-grow rows="2" class="mb-4" hide-details />
        <p v-if="activeTab !== 'advanced' && !activeSections.length && !(activeTab === 'content' && textChild)" class="text-body-2 text-medium-emphasis">No {{ activeTab }} settings for this element.</p>
        <template v-for="section in activeSections" :key="section.title">
          <div class="mb-6">
            <div v-if="section.title" class="text-overline mb-2 text-primary font-weight-bold">{{ section.title }}</div>

            <template v-for="field in section.fields" :key="fieldKey(field)">

              <VTextField
                v-if="field.kind === 'text'"
                :model-value="getStringProp(field.prop)"
                @update:model-value="value => updateProp(field.prop, value)"
                :label="field.label"
                :placeholder="field.placeholder"
                :clearable="field.clearable"
                variant="outlined"
                density="compact"
                class="mb-3"
                hide-details
              />

              <VTextarea
                v-else-if="field.kind === 'textarea'"
                :model-value="selectedNode.name"
                @update:model-value="updateSelectedName"
                :label="field.label"
                variant="outlined"
                density="compact"
                auto-grow
                rows="2"
                hide-details
              />

              <VSelect
                v-else-if="field.kind === 'select'"
                :model-value="getStringProp(field.prop)"
                @update:model-value="value => updateProp(field.prop, value)"
                :label="field.label"
                :items="field.options"
                variant="outlined"
                density="compact"
                class="mb-3"
                hide-details
              />

              <VSwitch
                v-else-if="field.kind === 'switch'"
                :model-value="getBooleanProp(field.prop)"
                @update:model-value="value => updateProp(field.prop, value)"
                :label="field.label"
                density="compact"
                color="primary"
                hide-details
                class="mb-1"
              />

              <VAutocomplete
                v-else-if="field.kind === 'icon-picker'"
                :model-value="getStringProp(field.prop)"
                @update:model-value="value => updateProp(field.prop, value)"
                :items="allIcons"
                item-title="name"
                item-value="value"
                :label="field.label"
                variant="outlined"
                density="compact"
                class="mb-3"
                hide-details
                clearable
              >
                <template #item="{ props: ip, item }">
                  <VListItem v-bind="ip" :prepend-icon="item.raw.value" :title="item.raw.name" />
                </template>
                <template #prepend-inner>
                  <VIcon
                    v-if="getStringProp(field.prop)"
                    :icon="getStringProp(field.prop) ?? undefined"
                    size="18"
                    class="mr-1"
                  />
                </template>
              </VAutocomplete>

              <template v-else-if="field.kind === 'slider'">
                <div class="text-caption mb-1">
                  {{ field.label }}: {{ selectedNode.props[field.prop] ?? field.min }}
                </div>
                <VSlider
                  :model-value="getNumberProp(field.prop)"
                  @update:model-value="value => updateProp(field.prop, value)"
                  :min="field.min"
                  :max="field.max"
                  :step="field.step ?? 1"
                  :aria-label="field.label"
                  thumb-label
                  color="primary"
                  class="mb-3"
                />
              </template>

              <div v-else-if="field.kind === 'row'" class="d-flex gap-2 mb-3">
                <VTextField
                  v-for="f in field.fields"
                  :key="f.prop"
                  :model-value="getStringProp(f.prop)"
                  @update:model-value="value => updateProp(f.prop, value)"
                  :label="f.label"
                  :placeholder="f.placeholder"
                  variant="outlined"
                  density="compact"
                  hide-details
                />
              </div>

              <template v-else-if="field.kind === 'icon-slots'">
                <VAutocomplete
                  v-for="s in field.slots"
                  :key="s.prop"
                  :model-value="getStringProp(s.prop)"
                  @update:model-value="value => updateProp(s.prop, value)"
                  :items="allIcons"
                  item-title="name"
                  item-value="value"
                  :label="s.label"
                  variant="outlined"
                  density="compact"
                  class="mb-3"
                  hide-details
                  clearable
                >
                  <template #item="{ props: ip, item }">
                    <VListItem v-bind="ip" :prepend-icon="item.raw.value" :title="item.raw.name" />
                  </template>
                </VAutocomplete>
              </template>

              <template v-else-if="field.kind === 'flex-layout'">
                <VSelect
                  label="Display Type"
                  :items="flexOptions"
                  :model-value="getFlexValue()"
                  density="compact"
                  variant="outlined"
                  class="mb-3"
                  hide-details
                  @update:model-value="setFlexValue"
                />
                <template v-if="selectedNode.classes.includes('d-flex')">
                  <div class="text-caption mb-1">Justify</div>
                  <VSelect
                    :items="['justify-start', 'justify-center', 'justify-space-between', 'justify-end']"
                    label="Justify"
                    density="compact"
                    variant="outlined"
                    class="mb-3"
                    hide-details
                    :model-value="getJustifyValue()"
                    @update:model-value="setJustifyValue"
                  />
                </template>
              </template>

              <template v-else-if="field.kind === 'typography'">
                <VSelect
                  label="Weight"
                  :items="fontWeights"
                  :model-value="getFontWeight()"
                  density="compact"
                  variant="outlined"
                  class="mb-3"
                  hide-details
                  @update:model-value="setFontWeight"
                />
                <VBtnToggle
                  density="compact"
                  color="primary"
                  variant="outlined"
                  class="mb-3"
                  :model-value="getTextAlign()"
                  @update:model-value="setTextAlign"
                >
                  <VBtn :value="'text-left'"   :icon="Icons.FormatAlignLeft" aria-label="Align text left"   size="small" />
                  <VBtn :value="'text-center'"  :icon="Icons.FormatAlignCenter" aria-label="Align text center" size="small" />
                  <VBtn :value="'text-right'"   :icon="Icons.FormatAlignRight" aria-label="Align text right"  size="small" />
                </VBtnToggle>
              </template>

              <template v-else-if="field.kind === 'spacing'">
                <div class="d-flex justify-center mb-4">
                  <VBtnToggle v-model="activeSpacingType" mandatory density="compact" color="primary" variant="outlined">
                    <VBtn value="m" size="small" class="px-4">Margin</VBtn>
                    <VBtn v-if="field.withPadding" value="p" size="small" class="px-4">Padding</VBtn>
                  </VBtnToggle>
                </div>
                <VRow dense>
                  <VCol v-for="side in spacingSides" :key="side.value" cols="6">
                    <VSelect
                      :label="side.label"
                      :items="spacingSizes"
                      :model-value="getSpacingValue(activeSpacingType, side.value)"
                      density="compact"
                      variant="outlined"
                      hide-details
                      @update:model-value="val => updateSpacing(activeSpacingType, side.value, val)"
                    />
                  </VCol>
                </VRow>
              </template>

              <!-- custom-classes rendered globally below all sections -->
              <template v-else-if="field.kind === 'custom-classes'" />

            </template>
          </div>
        </template>
      </div>

      <AdvancedProperties
        v-if="activeTab === 'advanced'"
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
      v-model="saveDialog"
      :name="prefabName"
      @update:name="prefabName = $event"
      @save="savePrefab"
    />
    <MoveNodeDialog
      v-model="moveDialog"
      :target="moveTarget"
      :targets="moveTargets"
      @update:target="moveTarget = $event"
      @move="moveSelected"
    />
  </div>
</template>

<style scoped>
.property-panel { flex: 1; min-height: 0; overflow-y: auto; }
.element-path { display: flex; flex-wrap: wrap; gap: 4px; margin-block: 8px; }
.element-path button { font-size: 12px; min-height: 28px; color: rgb(var(--v-theme-primary)); overflow-wrap: anywhere; text-align: left; }
.element-path button + button::before { content: '/'; padding-right: 4px; }
.property-tabs :deep(.v-tab) { min-width: 0; padding-inline: 10px; font-size: 12px; text-transform: none; }
</style>
