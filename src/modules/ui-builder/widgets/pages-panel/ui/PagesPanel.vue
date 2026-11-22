<script setup lang="ts">
import { computed, ref } from 'vue'
import { useUiTreeStore } from '../../../entities/ui-node/model/store'
import { useCheckedDrafts } from '../../../model/useCheckedDrafts'
import { parseLiteral } from '../../../entities/ui-node/model/runtime'
import { pagePathError, variableNameError } from '../../../entities/ui-node/model/projectMutations'

const store = useUiTreeStore()
const open = ref(false)
const newName = ref('')
const newPath = ref('')
const newKey = ref('')
const newValue = ref('')
// Problems show beside the field, while typing for new entries and on leaving the field for existing pages.
const newPathError = computed(() => (newPath.value.trim() ? pagePathError(store.pages, newPath.value.trim()) : null))
const newKeyError = computed(() => {
  const name = newKey.value.trim()
  if (!name) return null
  return variableNameError(name) ?? (name in store.project.state ? 'A variable with this name already exists.' : null)
})
const paths = useCheckedDrafts(
  (id, value) => (value ? pagePathError(store.pages, value, id) : 'Enter a route.'),
  (id, value) => store.updatePage(id, { path: value }),
)
const formatValue = (value: unknown) => (typeof value === 'string' ? value : JSON.stringify(value))

const addPage = () => {
  if (newPathError.value) return
  if (store.addPage(newName.value, newPath.value || undefined)) {
    newName.value = ''
    newPath.value = ''
  }
}
const addVariable = () => {
  if (newKeyError.value) return
  if (store.setStateVariable(newKey.value.trim(), parseLiteral(newValue.value))) {
    newKey.value = ''
    newValue.value = ''
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
    Pages &amp; variables
  </VBtn>
  <VDialog v-model="open" max-width="640" scrollable>
    <VCard title="Pages & variables">
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

        <div class="text-overline text-primary font-weight-bold mt-6 mb-1">Variables</div>
        <p class="text-body-2 mb-2">
          Values the page remembers while you preview it, such as whether a menu is open or what was typed in a search
          box. Show one as <code v-pre>{{ name }}</code> or use it in an element's Behavior settings. A value can be
          true, 3, text or JSON.
        </p>
        <div v-for="(value, key) in store.project.state" :key="key" class="d-flex align-center ga-2 mb-2">
          <code class="state-key">{{ key }}</code>
          <VTextField
            :model-value="formatValue(value)"
            :label="`Initial value of ${key}`"
            variant="outlined"
            density="compact"
            hide-details
            @change="
              (e: Event) => store.setStateVariable(String(key), parseLiteral((e.target as HTMLInputElement).value))
            "
          />
          <VBtn
            icon="mdi-delete-outline"
            variant="text"
            size="small"
            color="error"
            :aria-label="`Delete ${key}`"
            @click="store.removeStateVariable(String(key))"
          />
        </div>
        <form class="d-flex align-center ga-2 mt-3" @submit.prevent="addVariable">
          <VTextField
            v-model="newKey"
            :error-messages="newKeyError ?? []"
            label="Name"
            placeholder="isOpen"
            variant="outlined"
            density="compact"
            hide-details="auto"
          />
          <VTextField
            v-model="newValue"
            label="Initial value"
            placeholder="false"
            variant="outlined"
            density="compact"
            hide-details
          />
          <VBtn type="submit" color="primary" :disabled="!newKey.trim() || !!newKeyError">Add</VBtn>
        </form>
      </VCardText>
      <VCardActions><VSpacer /><VBtn @click="open = false">Close</VBtn></VCardActions>
    </VCard>
  </VDialog>
</template>

<style scoped>
.state-key {
  min-width: 90px;
}
</style>
