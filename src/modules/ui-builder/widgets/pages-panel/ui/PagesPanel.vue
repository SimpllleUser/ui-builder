<script setup lang="ts">
import { computed, ref } from 'vue'
import { useUiTreeStore, pagePathError } from '../../../entities/ui-node'
import { useCheckedDrafts } from '../../../../../shared/lib/useCheckedDrafts'

const store = useUiTreeStore()
const open = ref(false)
const newName = ref('')
const newPath = ref('')
// Problems show beside the field, while typing for new entries and on leaving the field for existing pages.
const newPathError = computed(() => (newPath.value.trim() ? pagePathError(store.pages, newPath.value.trim()) : null))
const paths = useCheckedDrafts(
  (id, value) => (value ? pagePathError(store.pages, value, id) : 'Enter a route.'),
  (id, value) => store.updatePage(id, { path: value }),
)

// Add stays pressable: pressing it without a name says what is missing beside the field instead of doing nothing.
const triedToAdd = ref(false)
const newNameError = computed(() => (triedToAdd.value && !newName.value.trim() ? 'Give the page a name.' : undefined))
const addPage = () => {
  triedToAdd.value = true
  if (!newName.value.trim() || newPathError.value) return
  if (store.addPage(newName.value, newPath.value || undefined)) {
    newName.value = ''
    newPath.value = ''
    triedToAdd.value = false
  }
}
const pick = (id: string) => {
  store.selectPage(id)
  open.value = false
}
const toggleLayout = (on: boolean) => {
  store.editLayout(on)
  open.value = false
}
</script>

<template>
  <VBtn size="small" variant="tonal" prepend-icon="mdi-tune-variant" aria-haspopup="dialog" @click="open = true">
    Pages &amp; layout
  </VBtn>
  <VDialog v-model="open" max-width="640" scrollable>
    <VCard title="Pages & layout">
      <VCardText>
        <div class="text-overline text-primary font-weight-bold mb-1">Pages</div>
        <VList density="compact" class="pa-0" aria-label="Pages">
          <VListItem
            v-for="page in store.pages"
            :key="page.id"
            :active="!store.editingLayout && page.id === store.activePage.id"
            color="primary"
            class="px-1"
            @click="pick(page.id)"
          >
            <div class="d-flex align-center ga-2" @click.stop>
              <VTextField
                :model-value="page.name"
                label="Name"
                variant="outlined"
                density="compact"
                hide-details
                style="min-width: 0"
                @change="(e: Event) => store.updatePage(page.id, { name: (e.target as HTMLInputElement).value })"
              />
              <VTextField
                :model-value="paths.shown(page.id, page.path)"
                :error-messages="paths.errorOf(page.id)"
                label="Path"
                variant="outlined"
                density="compact"
                hide-details="auto"
                style="min-width: 0"
                @update:model-value="value => paths.edit(page.id, value)"
                @blur="paths.commit(page.id)"
                @keydown.enter="paths.commit(page.id)"
              />
              <VBtn
                icon="mdi-pencil-outline"
                variant="text"
                size="small"
                aria-label="Edit page"
                title="Edit page"
                @click="pick(page.id)"
              />
              <VBtn
                icon="mdi-delete-outline"
                variant="text"
                size="small"
                color="error"
                :disabled="store.pages.length < 2"
                aria-label="Delete page"
                title="Delete page"
                @click="store.deletePage(page.id)"
              />
            </div>
          </VListItem>
        </VList>
        <form class="d-flex align-center ga-2 mt-3" @submit.prevent="addPage">
          <VTextField v-model="newName" label="New page name" variant="outlined" density="compact" hide-details />
          <VTextField
            v-model="newPath"
            :error-messages="newPathError ?? []"
            label="Path (optional)"
            placeholder="/orders"
            variant="outlined"
            density="compact"
            hide-details="auto"
          />
          <VBtn type="submit" color="primary" :disabled="!newName.trim() || !!newPathError">Add</VBtn>
        </form>

        <div class="text-overline text-primary font-weight-bold mt-6 mb-1">Shared layout</div>
        <p class="text-body-2 mb-2">
          App bar and navigation shared by every page. Place <strong>Page content</strong> where each page should
          appear.
        </p>
        <div class="d-flex ga-2 flex-wrap">
          <VBtn variant="tonal" prepend-icon="mdi-page-layout-header-footer" @click="toggleLayout(true)">{{
            store.project.layout ? 'Edit layout' : 'Create layout'
          }}</VBtn>
          <VBtn v-if="store.editingLayout" variant="text" @click="toggleLayout(false)">Back to page</VBtn>
          <VBtn v-if="store.project.layout" variant="text" color="error" @click="store.removeLayout()"
            >Remove layout</VBtn
          >
        </div>
      </VCardText>
      <VCardActions><VSpacer /><VBtn @click="open = false">Close</VBtn></VCardActions>
    </VCard>
  </VDialog>
</template>
