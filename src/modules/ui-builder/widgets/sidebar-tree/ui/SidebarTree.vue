<script setup lang="ts">
import { computed, ref } from 'vue'
import { LAYERS_HELP, SIDEBAR_VIEWS, SidebarView } from '../model/sidebarViews'
import HistoryView from './HistoryView.vue'
import LayersView from './LayersView.vue'
import SavedComponentsView from './SavedComponentsView.vue'
import WrapToolbar from './WrapToolbar.vue'

/** The left panel: an activity bar that switches between components, layers, saved components and history. */
const emit = defineEmits<{ close: [] }>()
const activeView = ref<SidebarView>(SidebarView.Layers)
const viewTitle = computed(() => SIDEBAR_VIEWS.find(view => view.id === activeView.value)?.label ?? 'Layers')
</script>

<template>
  <div class="sidebar-drawer">
    <div class="d-flex flex-column h-100">
      <div class="sidebar-layout">
        <nav class="activity-bar" aria-label="Builder views">
          <button
            v-for="view in SIDEBAR_VIEWS"
            :key="view.id"
            class="activity-button"
            :class="{ 'activity-button--active': activeView === view.id }"
            :aria-pressed="activeView === view.id"
            :title="view.label"
            @click="activeView = view.id"
          >
            <VIcon :icon="view.icon" size="21" aria-hidden="true" />
            <span class="sr-only">{{ view.label }}</span>
          </button>
        </nav>

        <section class="sidebar-view" :aria-label="viewTitle">
          <div class="explorer-heading">
            <span>{{ viewTitle }}</span>
            <span class="explorer-heading__actions">
              <VBtn
                v-if="activeView === SidebarView.Layers"
                icon
                size="x-small"
                variant="text"
                aria-label="Keyboard help"
                aria-describedby="layers-help"
              >
                <VIcon icon="mdi-help-circle-outline" size="18" />
                <VTooltip activator="parent" location="bottom" max-width="260">{{ LAYERS_HELP }}</VTooltip>
              </VBtn>
              <VBtn icon size="x-small" variant="text" aria-label="Close panel" @click="emit('close')">
                <VIcon icon="mdi-close" size="18" />
              </VBtn>
            </span>
          </div>

          <!-- The component library is another widget; the app puts it here, so this widget needs no import of it. -->
          <slot v-if="activeView === SidebarView.Components" name="components" />
          <LayersView v-else-if="activeView === SidebarView.Layers" />
          <SavedComponentsView v-else-if="activeView === SidebarView.Prefabs" />
          <HistoryView v-else />
        </section>
      </div>

      <WrapToolbar v-if="activeView === SidebarView.Layers" />
    </div>
  </div>
</template>

<style scoped>
.sidebar-drawer {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  :deep(.v-slide-group) {
    flex-grow: 0 !important;
  }
}

.sidebar-layout {
  display: flex;
  flex: 1;
  min-height: 0;
}

.activity-bar {
  display: flex;
  flex: 0 0 44px;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 4px;
  border-right: 1px solid rgba(var(--v-border-color), 0.15);
  background: rgb(var(--v-theme-surface-light));
}

.activity-button {
  position: relative;
  display: grid;
  width: 36px;
  height: 40px;
  place-items: center;
  border-radius: 5px;
  color: rgb(var(--v-theme-on-surface));
  opacity: 0.65;
}

.activity-button:hover,
.activity-button:focus-visible,
.activity-button--active {
  color: rgb(var(--v-theme-primary));
  opacity: 1;
  background: rgba(var(--v-theme-primary), 0.1);
}

.activity-button--active::before {
  position: absolute;
  left: -4px;
  width: 2px;
  height: 24px;
  border-radius: 2px;
  background: rgb(var(--v-theme-primary));
  content: '';
}

.sidebar-view {
  display: flex;
  flex: 1;
  min-width: 0;
  min-height: 0;
  flex-direction: column;
  container-type: inline-size;
}

.sidebar-view__scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.explorer-heading {
  display: flex;
  align-items: center;
  min-height: 36px;
  padding: 0 12px;
  color: rgb(var(--v-theme-on-surface));
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.explorer-heading__actions {
  display: flex;
  margin-left: auto;
}
</style>
