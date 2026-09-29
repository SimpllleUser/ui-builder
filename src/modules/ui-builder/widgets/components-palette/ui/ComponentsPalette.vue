<script setup lang="ts">
import { ref, computed } from 'vue'
import { PALETTE_COMPONENTS } from '../../../entities/ui-node/model/componentDefinitions'
import { useUiTreeStore } from '../../../entities/ui-node/model/store'
const store = useUiTreeStore()
const search = ref('')
const components = computed(() => PALETTE_COMPONENTS.filter(c => c.label.toLowerCase().includes((search.value ?? '').toLowerCase())))
const onDragStart = (e: DragEvent, type: string) => {
  store.commit()
  e.dataTransfer?.setData('componenttype', type)
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'copy'
}
</script>

<template>
  <section class="components-palette" aria-label="Component library">
    <div class="components-palette__body">
      <VTextField v-model="search" class="component-search" label="Find a component" prepend-inner-icon="mdi-magnify" variant="outlined" density="compact" hide-details clearable @click:clear="search = ''" />
      <p class="insertion-hint" aria-live="polite">Add to <strong>{{ store.insertionTarget.name }}</strong>. Choose a component or drag it onto the canvas.</p>
      <div class="palette-grid" role="list" :aria-label="`Components, ${components.length} available`">
        <div v-for="comp in components" :key="comp.type" role="listitem">
          <button type="button" class="palette-item" draggable="true" :aria-label="`Add ${comp.label} to ${store.insertionTarget.name}`" :title="`Add ${comp.label} to ${store.insertionTarget.name}`" @click="store.addComponent(comp.type)" @dragstart="onDragStart($event, comp.type)">
            <VIcon :icon="comp.treeIcon" size="20" aria-hidden="true" /><span>{{ comp.label }}</span>
          </button>
        </div>
      </div>
      <p v-if="!components.length" class="insertion-hint">No components match your search.</p>
    </div>
  </section>
</template>

<style scoped>
.components-palette { flex-shrink: 0; }
.components-palette__body { padding: 8px 12px 12px; }
.component-search { flex-shrink: 0; }
.component-search :deep(.v-input__control),
.component-search :deep(.v-field),
.component-search :deep(.v-field__field) { height: 32px !important; min-height: 32px !important; }
.component-search :deep(.v-field__input) { min-height: 30px !important; padding-top: 0 !important; padding-bottom: 0 !important; }
.component-search :deep(.v-field__prepend-inner),
.component-search :deep(.v-field__append-inner),
.component-search :deep(.v-input__append) { padding-top: 0 !important; padding-bottom: 0 !important; }
.component-search :deep(.v-input__append) { height: 32px !important; }
.insertion-hint { font-size: 12px; margin: 8px 0; overflow-wrap: anywhere; }
.palette-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); align-content: start; gap: 8px; max-height: 420px; overflow-y: auto; padding: 3px; }
.palette-item { display: flex; width: 100%; min-height: 64px; flex-direction: column; align-items: center; justify-content: center; padding: 7px 5px; gap: 5px; border: 1px solid rgba(var(--v-border-color), .2); border-radius: 8px; background: rgb(var(--v-theme-surface)); cursor: grab; }
.palette-item:hover { border-color: rgb(var(--v-theme-primary)); background: rgba(var(--v-theme-primary), .07); }
.palette-item:active { cursor: grabbing; }
.palette-item span { max-width: 100%; font-size: 12px; line-height: 1.3; text-align: center; overflow-wrap: anywhere; }
@container (min-width: 360px) {
  .palette-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}
</style>
