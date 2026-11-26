<script setup lang="ts">
import { TEMPLATES, type TemplateKind } from '../../../entities/ui-node'

/** What an empty canvas offers: browse the components or start from a template. */
const emit = defineEmits<{ 'open-components': []; 'add-template': [kind: TemplateKind] }>()
</script>

<template>
  <div class="canvas-empty" @click.stop>
    <VIcon icon="mdi-view-dashboard-outline" size="40" color="primary" />
    <h1>Build your first page</h1>
    <p>Add a component, drag one onto the canvas, or start with a template.</p>
    <VBtn color="primary" prepend-icon="mdi-plus" class="my-4" @click="emit('open-components')">Browse components</VBtn>
    <div class="template-grid" data-tour="start">
      <button v-for="template in TEMPLATES" :key="template.kind" @click="emit('add-template', template.kind)">
        <VIcon :icon="template.icon" /><strong>{{ template.label }}</strong
        ><span>{{ template.description }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.canvas-empty {
  max-width: 640px;
  margin: 24px auto;
  text-align: center;
}
.canvas-empty h1 {
  font-size: 24px;
  margin: 12px 0 8px;
}
.canvas-empty p {
  font-size: 14px;
  color: rgb(var(--v-theme-on-surface));
  opacity: 0.75;
}
.template-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(145px, 1fr));
  gap: 12px;
  margin-top: 12px;
}
.template-grid button {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 20px 12px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.2);
  border-radius: 12px;
  background: rgb(var(--v-theme-surface));
}
.template-grid button:hover {
  border-color: rgb(var(--v-theme-primary));
}
.template-grid span {
  font-size: 12px;
}
</style>
