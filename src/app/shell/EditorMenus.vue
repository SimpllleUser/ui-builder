<script setup lang="ts">
/** The three menus of the top bar. Each holds one kind of thing, so a name says what is behind it. */
defineProps<{ modifierKey: string }>()
const designTab = defineModel<boolean>('designTab', { required: true })

defineEmits<{
  importProject: []
  exportProject: []
  exportCode: []
  toggleFocus: []
  openTheme: []
  startTour: []
  openGuide: []
}>()
</script>

<template>
  <div class="editor-menus">
    <VMenu location="bottom end">
      <template #activator="{ props: menu }">
        <VBtn v-bind="menu" size="small" variant="text" prepend-icon="mdi-file-outline" append-icon="mdi-menu-down">
          <span class="editor-menus__label">File</span>
        </VBtn>
      </template>
      <VList density="compact" aria-label="File">
        <VListItem
          prepend-icon="mdi-import"
          title="Import project…"
          subtitle="Add a JSON backup as a new project"
          @click="$emit('importProject')"
        />
        <VListItem
          prepend-icon="mdi-export"
          title="Export project"
          subtitle="Save a JSON backup"
          @click="$emit('exportProject')"
        />
        <VDivider />
        <VListItem
          prepend-icon="mdi-code-tags"
          title="Export code…"
          subtitle="Vue files for pages and components"
          @click="$emit('exportCode')"
        />
      </VList>
    </VMenu>

    <VMenu location="bottom end">
      <template #activator="{ props: menu }">
        <VBtn v-bind="menu" size="small" variant="text" prepend-icon="mdi-monitor-eye" append-icon="mdi-menu-down">
          <span class="editor-menus__label">View</span>
        </VBtn>
      </template>
      <VList density="compact" aria-label="View">
        <VListItem
          prepend-icon="mdi-arrow-expand-all"
          title="Focus mode"
          :subtitle="`Only the canvas · ${modifierKey} \\`"
          @click="$emit('toggleFocus')"
        />
        <VListItem
          prepend-icon="mdi-palette-swatch-outline"
          title="Theme…"
          subtitle="Colours, corners, density and dark mode"
          @click="$emit('openTheme')"
        />
        <VListItem
          prepend-icon="mdi-palette-outline"
          title="Design tab in Properties"
          subtitle="Figma-style size, layout, radius and fill"
          :append-icon="designTab ? 'mdi-check' : undefined"
          @click="designTab = !designTab"
        />
      </VList>
    </VMenu>

    <VMenu location="bottom end">
      <template #activator="{ props: menu }">
        <VBtn
          v-bind="menu"
          size="small"
          variant="text"
          prepend-icon="mdi-help-circle-outline"
          append-icon="mdi-menu-down"
        >
          <span class="editor-menus__label">Help</span>
        </VBtn>
      </template>
      <VList density="compact" aria-label="Help">
        <VListItem
          prepend-icon="mdi-book-open-variant"
          title="Behavior guide"
          subtitle="Conditions, repeats, clicks and variables"
          @click="$emit('openGuide')"
        />
        <VListItem
          prepend-icon="mdi-compass-outline"
          title="Quick tour"
          subtitle="The first steps in three moves"
          @click="$emit('startTour')"
        />
      </VList>
    </VMenu>
  </div>
</template>

<style scoped>
.editor-menus {
  display: flex;
  align-items: center;
}
/* On a narrow bar the words go and the icons stay, like the Search button. */
@media (max-width: 900px) {
  .editor-menus__label {
    display: none;
  }
}
</style>
