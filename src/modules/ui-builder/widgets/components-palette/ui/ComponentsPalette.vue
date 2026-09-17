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
    <VTextField v-model="search" label="Find a component" prepend-inner-icon="mdi-magnify" variant="outlined" density="compact" hide-details clearable @click:clear="search = ''" />
    <p class="insertion-hint">Add to <strong>{{ store.insertionTarget.name }}</strong></p>
    <div class="palette-grid">
      <button v-for="comp in components" :key="comp.type" class="palette-item" draggable="true" :title="`Add ${comp.label} to ${store.insertionTarget.name}`" @click="store.addComponent(comp.type)" @dragstart="onDragStart($event, comp.type)">
        <VIcon :icon="comp.treeIcon" size="20" /><span>{{ comp.label }}</span>
      </button>
    </div>
    <p v-if="!components.length" class="insertion-hint">No components match your search.</p>
  </section>
</template>

<style scoped>
.components-palette { padding: 12px; border-bottom: 1px solid rgba(var(--v-border-color), .15); flex-shrink: 0; }
.insertion-hint { font-size: 12px; margin: 8px 0; overflow-wrap: anywhere; }
.palette-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(76px, 1fr)); gap: 6px; max-height: 240px; overflow-y: auto; padding: 3px; }
.palette-item { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 68px; padding: 6px; gap: 6px; border: 1px solid rgba(var(--v-border-color), .2); border-radius: 8px; background: rgb(var(--v-theme-surface)); cursor: grab; }
.palette-item:hover { border-color: rgb(var(--v-theme-primary)); background: rgba(var(--v-theme-primary), .07); }
.palette-item:active { cursor: grabbing; }
.palette-item span { font-size: 12px; line-height: 1.3; }
</style>
