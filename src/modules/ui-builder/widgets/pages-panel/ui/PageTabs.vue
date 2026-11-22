<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useUiTreeStore } from '../../../entities/ui-node/model/store'

const LAYOUT_TAB = 'layout'

const store = useUiTreeStore()
const tablist = ref<HTMLElement>()

const activeTab = computed(() => (store.editingLayout ? LAYOUT_TAB : store.activePage.id))
const tabIds = computed(() => [...store.pages.map(page => page.id), ...(store.project.layout ? [LAYOUT_TAB] : [])])
const activeIndex = computed(() => store.pages.findIndex(page => page.id === store.activePage.id))

const choose = (id: string) => (id === LAYOUT_TAB ? store.editLayout(true) : store.selectPage(id))

// Keep the active tab visible when there are more pages than fit.
watch(activeTab, async () => {
  await nextTick()
  tablist.value?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
})

const onKeydown = (event: KeyboardEvent) => {
  const tabs = [...(tablist.value?.querySelectorAll<HTMLElement>('[role="tab"]') ?? [])]
  const index = tabs.indexOf(event.target as HTMLElement)
  if (index < 0) return
  const target =
    event.key === 'ArrowRight'
      ? tabs[(index + 1) % tabs.length]
      : event.key === 'ArrowLeft'
        ? tabs[(index - 1 + tabs.length) % tabs.length]
        : event.key === 'Home'
          ? tabs[0]
          : event.key === 'End'
            ? tabs[tabs.length - 1]
            : null
  if (!target) return
  event.preventDefault()
  target.focus()
  choose(tabIds.value[tabs.indexOf(target)])
}

// ─── Add / edit page dialog ──────────────────────────────────────────────────
const dialog = ref<{ mode: 'add' | 'edit'; id?: string } | null>(null)
const draftName = ref('')
const draftPath = ref('')
const open = computed({
  get: () => dialog.value !== null,
  set: value => {
    if (!value) dialog.value = null
  },
})

const openAdd = () => {
  draftName.value = ''
  draftPath.value = ''
  dialog.value = { mode: 'add' }
}
const openEdit = () => {
  draftName.value = store.activePage.name
  draftPath.value = store.activePage.path
  dialog.value = { mode: 'edit', id: store.activePage.id }
}
const editPage = (id: string) => {
  store.selectPage(id)
  openEdit()
}
const submit = () => {
  const current = dialog.value
  if (!current || !draftName.value.trim()) return
  const done =
    current.mode === 'add'
      ? !!store.addPage(draftName.value, draftPath.value || undefined)
      : store.updatePage(current.id!, { name: draftName.value, path: draftPath.value })
  if (done) dialog.value = null
}
</script>

<template>
  <div class="page-tabs">
    <div ref="tablist" class="page-tabs__list" role="tablist" aria-label="Pages" @keydown="onKeydown">
      <button
        v-for="page in store.pages"
        :key="page.id"
        role="tab"
        class="page-tab"
        :class="{ 'page-tab--active': page.id === activeTab }"
        :aria-selected="page.id === activeTab"
        :tabindex="page.id === activeTab ? 0 : -1"
        :title="`${page.name} — ${page.path}`"
        @click="store.selectPage(page.id)"
        @dblclick="editPage(page.id)"
      >
        <span class="page-tab__name">{{ page.name }}</span>
        <span class="page-tab__path">{{ page.path }}</span>
      </button>
      <button
        v-if="store.project.layout"
        role="tab"
        class="page-tab page-tab--layout"
        :class="{ 'page-tab--active': activeTab === LAYOUT_TAB }"
        :aria-selected="activeTab === LAYOUT_TAB"
        :tabindex="activeTab === LAYOUT_TAB ? 0 : -1"
        title="Shared layout: app bar and navigation of every page"
        @click="store.editLayout(true)"
      >
        <VIcon icon="mdi-page-layout-header-footer" size="16" />
        <span class="page-tab__name">Layout</span>
      </button>
    </div>

    <VBtn icon="mdi-plus" size="small" variant="text" aria-label="Add page" title="Add page" @click="openAdd" />

    <VMenu location="bottom end">
      <template #activator="{ props: menu }">
        <VBtn
          v-bind="menu"
          icon="mdi-dots-vertical"
          size="small"
          variant="text"
          aria-label="Page actions"
          title="Page actions"
        />
      </template>
      <VList density="compact">
        <VListItem prepend-icon="mdi-pencil-outline" title="Rename or change route…" @click="openEdit" />
        <VListItem
          prepend-icon="mdi-content-copy"
          title="Duplicate page"
          @click="store.duplicatePage(store.activePage.id)"
        />
        <VListItem
          prepend-icon="mdi-arrow-left"
          title="Move left"
          :disabled="activeIndex < 1"
          @click="store.movePage(store.activePage.id, -1)"
        />
        <VListItem
          prepend-icon="mdi-arrow-right"
          title="Move right"
          :disabled="activeIndex >= store.pages.length - 1"
          @click="store.movePage(store.activePage.id, 1)"
        />
        <VDivider />
        <VListItem
          v-if="!store.project.layout"
          prepend-icon="mdi-page-layout-header-footer"
          title="Create shared layout"
          @click="store.editLayout(true)"
        />
        <VListItem
          prepend-icon="mdi-delete-outline"
          base-color="error"
          title="Delete page"
          :disabled="store.pages.length < 2"
          @click="store.deletePage(store.activePage.id)"
        />
      </VList>
    </VMenu>

    <VDialog v-model="open" max-width="420">
      <VCard :title="dialog?.mode === 'add' ? 'New page' : 'Page settings'">
        <form @submit.prevent="submit">
          <VCardText class="d-flex flex-column ga-3">
            <VTextField v-model="draftName" label="Name" variant="outlined" density="compact" autofocus hide-details />
            <VTextField
              v-model="draftPath"
              label="Route"
              :placeholder="dialog?.mode === 'add' ? 'Created from the name, e.g. /orders' : '/orders'"
              variant="outlined"
              density="compact"
              hide-details
            />
          </VCardText>
          <VCardActions>
            <VSpacer />
            <VBtn @click="dialog = null">Cancel</VBtn>
            <VBtn type="submit" color="primary" variant="flat" :disabled="!draftName.trim()">
              {{ dialog?.mode === 'add' ? 'Add page' : 'Save' }}
            </VBtn>
          </VCardActions>
        </form>
      </VCard>
    </VDialog>
  </div>
</template>

<style scoped>
.page-tabs {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 8px;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.15);
  background: rgb(var(--v-theme-surface));
}
.page-tabs__list {
  display: flex;
  flex: 1;
  min-width: 0;
  overflow-x: auto;
  scrollbar-width: thin;
}
.page-tab {
  display: flex;
  align-items: baseline;
  gap: 6px;
  flex-shrink: 0;
  max-width: 220px;
  padding: 8px 14px;
  font-size: 13px;
  border-bottom: 2px solid transparent;
  color: rgba(var(--v-theme-on-surface), 0.75);
}
.page-tab:hover {
  background: rgba(var(--v-theme-on-surface), 0.04);
}
.page-tab:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: -2px;
}
.page-tab--active {
  color: rgb(var(--v-theme-primary));
  border-bottom-color: rgb(var(--v-theme-primary));
  font-weight: 600;
}
.page-tab--layout {
  align-items: center;
}
.page-tab__name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.page-tab__path {
  font-size: 11px;
  opacity: 0.6;
  font-weight: 400;
}
@media (max-width: 600px) {
  .page-tab__path {
    display: none;
  }
}
</style>
