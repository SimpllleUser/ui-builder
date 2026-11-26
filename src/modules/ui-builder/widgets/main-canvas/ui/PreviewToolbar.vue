<script setup lang="ts">
import { computed } from 'vue'
import { explainHiddenElements, useUiTreeStore, valueToText } from '../../../entities/ui-node'
import { PREVIEW_DEVICES } from '../model/previewDevices'

const ZOOM_ITEMS = [50, 75, 100, 125].map(percent => ({ title: `${percent}%`, value: percent }))

/** The toolbar controls of Preview: where it is, what the variables are, what is hidden, and the screen size. */
const viewport = defineModel<number>('viewport', { required: true })
const zoom = defineModel<number>('zoom', { required: true })
const store = useUiTreeStore()
const variables = computed(() =>
  Object.entries(store.runtimeState).map(([name, value]) => ({ name, value: valueToText(value) })),
)
// Why something is missing from the page: the elements a condition keeps out of sight right now.
const hiddenElements = computed(() => explainHiddenElements(store.describePreview().hidden, store.runtimeState))
const pageItems = computed(() => store.pages.map(page => ({ title: page.name, subtitle: page.path, value: page.id })))
</script>

<template>
  <!-- While a saved component is open, Preview shows only it; this switches to another one. -->
  <VMenu v-if="store.editingPrefab" location="bottom start">
    <template #activator="{ props: menu }">
      <VBtn
        v-bind="menu"
        size="small"
        variant="tonal"
        prepend-icon="mdi-puzzle-outline"
        append-icon="mdi-menu-down"
        :aria-label="`Preview shows the component ${store.editingPrefab.name}. Choose another component`"
      >
        {{ store.editingPrefab.name }}
      </VBtn>
    </template>
    <VList density="compact" aria-label="Saved components">
      <VListItem
        v-for="prefab in store.prefabs"
        :key="prefab.prefabId"
        :title="prefab.name"
        :active="prefab.prefabId === store.editingPrefab.prefabId"
        @click="store.editPrefab(prefab.prefabId)"
      />
    </VList>
  </VMenu>
  <!-- Where the preview is now, like a browser's address bar; click to jump to another page. -->
  <VMenu v-else location="bottom start">
    <template #activator="{ props: menu }">
      <VBtn
        v-bind="menu"
        class="route-pill"
        size="small"
        variant="tonal"
        prepend-icon="mdi-web"
        append-icon="mdi-menu-down"
        :aria-label="`Preview is on ${store.previewPage.name}, route ${store.previewPage.path}. Choose another page`"
      >
        <span class="route-pill__path">{{ store.previewPage.path }}</span>
      </VBtn>
    </template>
    <VList density="compact" aria-label="Pages">
      <VListItem
        v-for="item in pageItems"
        :key="item.value"
        :title="item.title"
        :subtitle="item.subtitle"
        :active="item.value === store.previewPage.id"
        @click="store.previewPageId = item.value"
      />
    </VList>
  </VMenu>
  <!-- What the variables are right now, to see why something does or does not show. -->
  <VMenu v-if="variables.length" location="bottom start" :close-on-content-click="false">
    <template #activator="{ props: menu }">
      <VBtn v-bind="menu" size="small" variant="text" prepend-icon="mdi-variable">
        {{ variables.length }} {{ variables.length === 1 ? 'variable' : 'variables' }}
      </VBtn>
    </template>
    <VCard min-width="240" class="pa-3">
      <div class="text-overline mb-1">Current values</div>
      <dl class="variable-list">
        <template v-for="variable in variables" :key="variable.name">
          <dt>{{ variable.name }}</dt>
          <dd>{{ variable.value }}</dd>
        </template>
      </dl>
    </VCard>
  </VMenu>
  <!-- An element that is not on the page is hard to explain; this says which condition hides it and why. -->
  <VMenu v-if="hiddenElements.length" location="bottom start" :close-on-content-click="false">
    <template #activator="{ props: menu }">
      <VBtn v-bind="menu" size="small" variant="text" prepend-icon="mdi-eye-off-outline">
        {{ hiddenElements.length }} hidden
      </VBtn>
    </template>
    <VCard min-width="300" max-width="420" class="pa-3">
      <div class="text-overline mb-1">Hidden by conditions</div>
      <ul class="hidden-list">
        <li v-for="element in hiddenElements" :key="element.id" class="hidden-list__item">
          <div class="hidden-list__name">
            {{ element.name
            }}<span v-if="element.copies > 1" class="text-medium-emphasis"> × {{ element.copies }}</span>
          </div>
          <code class="hidden-list__condition">{{ element.condition }}</code>
          <div class="text-caption text-medium-emphasis">
            <template v-if="element.reads.length">
              Right now:
              <span v-for="(read, position) in element.reads" :key="read.name">
                <span v-if="position">, </span><b>{{ read.name }}</b> = {{ read.value }}
              </span>
            </template>
            <template v-if="element.dependsOnRepeat">
              {{ element.reads.length ? ' · ' : '' }}also depends on each item of its repeat
            </template>
          </div>
        </li>
      </ul>
    </VCard>
  </VMenu>
  <VBtn
    size="small"
    variant="text"
    prepend-icon="mdi-restore"
    title="Set every variable back to its starting value and return to the first page"
    @click="store.resetPreview()"
  >
    Reset
  </VBtn>
  <VSelect
    v-if="!store.editingPrefab"
    v-model="viewport"
    :items="PREVIEW_DEVICES"
    label="Viewport"
    variant="outlined"
    density="compact"
    hide-details
    class="viewport-select"
  />
  <VSelect
    v-if="!store.editingPrefab"
    v-model="zoom"
    :items="ZOOM_ITEMS"
    label="Zoom"
    variant="outlined"
    density="compact"
    hide-details
    class="zoom-select"
  />
</template>

<style scoped>
.viewport-select {
  flex: 0 1 190px !important;
  min-width: 150px;
}
.zoom-select {
  flex: 0 1 120px !important;
  min-width: 110px;
}
.route-pill {
  text-transform: none;
  letter-spacing: 0;
}
.route-pill__path {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 13px;
}
.hidden-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.hidden-list__name {
  font-size: 13px;
  font-weight: 600;
}
.hidden-list__condition {
  font-size: 12px;
  overflow-wrap: anywhere;
}
.variable-list {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 4px 16px;
  margin: 0;
  font-size: 13px;
}
.variable-list dt {
  font-weight: 600;
}
.variable-list dd {
  margin: 0;
  overflow-wrap: anywhere;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  opacity: 0.85;
}
</style>
