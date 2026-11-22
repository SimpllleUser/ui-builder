<script setup lang="ts">
import { ref, computed } from 'vue'
import { useStorage } from '@vueuse/core'
import {
  COMPONENT_CATEGORY_ORDER,
  getComponentCategory,
  PALETTE_COMPONENTS,
  getComponentDef,
  useUiTreeStore,
} from '../../../entities/ui-node'
import PaletteItem from './PaletteItem.vue'
import { quickSections } from '../model/quickSections'
const store = useUiTreeStore()
const search = ref('')
const favorites = useStorage<string[]>('ui-builder:favorite-components', [])
// "All components" stays folded until asked for, so the first screen is short.
const showAll = useStorage('ui-builder:palette-show-all', false)
const searching = computed(() => !!search.value?.trim())
const available = new Set(PALETTE_COMPONENTS.map(component => component.type))
const quick = computed(() =>
  quickSections(favorites.value, store.recentComponentTypes, available).map(section => ({
    ...section,
    items: section.types.map(type => getComponentDef(type)!),
  })),
)
const toggleFavorite = (type: string) => {
  favorites.value = favorites.value.includes(type)
    ? favorites.value.filter(item => item !== type)
    : [...favorites.value, type]
}
const components = computed(() =>
  PALETTE_COMPONENTS.filter(c => c.label.toLowerCase().includes((search.value ?? '').toLowerCase())),
)
const componentGroups = computed(() =>
  COMPONENT_CATEGORY_ORDER.map(label => ({
    label,
    items: components.value.filter(component => getComponentCategory(component.type) === label),
  })).filter(group => group.items.length),
)
const onDragStart = (e: DragEvent, type: string) => {
  store.commit()
  e.dataTransfer?.setData('componenttype', type)
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'copy'
}
</script>

<template>
  <section class="components-palette" aria-label="Component library">
    <div class="components-palette__body">
      <VTextField
        v-model="search"
        class="component-search"
        label="Find a component"
        prepend-inner-icon="mdi-magnify"
        variant="outlined"
        density="compact"
        hide-details
        clearable
        @click:clear="search = ''"
      />
      <p class="insertion-hint" aria-live="polite">
        Add to <strong>{{ store.insertionTarget.name }}</strong>. Choose a component or drag it onto the canvas.
      </p>
      <!-- The few things most people reach for, before the full library. -->
      <template v-if="!searching">
        <section v-for="section in quick" :key="section.id" class="palette-group" :aria-label="section.title">
          <h3 class="palette-group__title">{{ section.title }}</h3>
          <div class="palette-grid" role="list" :aria-label="`${section.title} components`">
            <PaletteItem
              v-for="comp in section.items"
              :key="comp.type"
              :component="comp"
              :favorite="favorites.includes(comp.type)"
              :target="store.insertionTarget.name"
              @add="store.addComponent(comp.type)"
              @toggle-favorite="toggleFavorite(comp.type)"
              @dragstart="onDragStart($event, comp.type)"
            />
          </div>
        </section>
        <button
          type="button"
          class="palette-all-toggle"
          :aria-expanded="showAll"
          aria-controls="palette-all"
          @click="showAll = !showAll"
        >
          <VIcon :icon="showAll ? 'mdi-chevron-down' : 'mdi-chevron-right'" size="18" aria-hidden="true" />
          All components <span>{{ PALETTE_COMPONENTS.length }}</span>
        </button>
      </template>
      <div
        v-show="searching || showAll"
        id="palette-all"
        class="palette-groups"
        :aria-label="`Components, ${components.length} available`"
      >
        <section v-for="group in componentGroups" :key="group.label" class="palette-group" :aria-label="group.label">
          <h3 class="palette-group__title">
            {{ group.label }} <span>{{ group.items.length }}</span>
          </h3>
          <div class="palette-grid" role="list" :aria-label="`${group.label} components`">
            <PaletteItem
              v-for="comp in group.items"
              :key="comp.type"
              :component="comp"
              :favorite="favorites.includes(comp.type)"
              :target="store.insertionTarget.name"
              @add="store.addComponent(comp.type)"
              @toggle-favorite="toggleFavorite(comp.type)"
              @dragstart="onDragStart($event, comp.type)"
            />
          </div>
        </section>
      </div>
      <p v-if="!components.length" class="insertion-hint">No components match your search.</p>
    </div>
  </section>
</template>

<style scoped>
.components-palette {
  flex-shrink: 0;
}
.components-palette__body {
  padding: 8px 12px 12px;
}
.component-search {
  flex-shrink: 0;
}
.component-search :deep(.v-input__control),
.component-search :deep(.v-field),
.component-search :deep(.v-field__field) {
  height: 32px !important;
  min-height: 32px !important;
}
.component-search :deep(.v-field__input) {
  min-height: 30px !important;
  padding-top: 0 !important;
  padding-bottom: 0 !important;
}
.component-search :deep(.v-field__prepend-inner),
.component-search :deep(.v-field__append-inner),
.component-search :deep(.v-input__append) {
  height: 32px !important;
  padding-top: 0 !important;
  padding-bottom: 0 !important;
}
.insertion-hint {
  font-size: 12px;
  margin: 8px 0;
  overflow-wrap: anywhere;
}
.palette-groups {
  overflow-y: auto;
  max-height: 420px;
  padding: 0 3px 3px;
}
.palette-group + .palette-group {
  margin-top: 14px;
}
.palette-group__title {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 0 6px;
  color: rgb(var(--v-theme-on-surface));
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.palette-group__title::after {
  flex: 1;
  height: 1px;
  background: rgba(var(--v-border-color), 0.15);
  content: '';
}
.palette-group__title span {
  order: 3;
  font-size: 10px;
  font-weight: 400;
  opacity: 0.6;
}
.palette-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-content: start;
  gap: 8px;
}
.palette-all-toggle {
  display: flex;
  align-items: center;
  gap: 4px;
  width: 100%;
  margin: 12px 0 8px;
  padding: 4px 0;
  color: rgb(var(--v-theme-primary));
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.palette-all-toggle span {
  font-size: 10px;
  font-weight: 400;
  opacity: 0.6;
}
@container (min-width: 360px) {
  .palette-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>
