<script setup lang="ts">
import { computed, ref } from 'vue'
import { useUiTreeStore } from '../../../entities/ui-node/model/store'
import { parseLiteral } from '../../../entities/ui-node/model/runtime'

const store = useUiTreeStore()
const open = ref(false)
const newName = ref('')
const newPath = ref('')
const newKey = ref('')
const newValue = ref('')
const label = computed(() => (store.editingLayout ? 'Shared layout' : store.activePage.name))
const formatValue = (value: unknown) => (typeof value === 'string' ? value : JSON.stringify(value))

const addPage = () => {
  if (store.addPage(newName.value, newPath.value || undefined)) {
    newName.value = ''
    newPath.value = ''
  }
}
const addVariable = () => {
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
  <VBtn
    size="small"
    variant="tonal"
    prepend-icon="mdi-file-multiple-outline"
    append-icon="mdi-menu-down"
    class="pages-button"
    aria-haspopup="dialog"
    @click="open = true"
  >
    <span class="pages-button__label">{{ label }}</span>
  </VBtn>
  <VDialog v-model="open" max-width="640" scrollable>
    <VCard title="Pages & state">
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
                :model-value="page.path"
                label="Path"
                variant="outlined"
                density="compact"
                hide-details
                style="min-width: 0"
                @change="(e: Event) => store.updatePage(page.id, { path: (e.target as HTMLInputElement).value })"
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
            label="Path (optional)"
            placeholder="/orders"
            variant="outlined"
            density="compact"
            hide-details
          />
          <VBtn type="submit" color="primary" :disabled="!newName.trim()">Add</VBtn>
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

        <div class="text-overline text-primary font-weight-bold mt-6 mb-1">State variables</div>
        <p class="text-body-2 mb-2">
          Initial values for bindings and events. Use them as <code v-pre>{{ name }}</code>, in v-model, v-if and v-for.
          Values: true, 3, text or JSON.
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
            label="Name"
            placeholder="isOpen"
            variant="outlined"
            density="compact"
            hide-details
          />
          <VTextField
            v-model="newValue"
            label="Initial value"
            placeholder="false"
            variant="outlined"
            density="compact"
            hide-details
          />
          <VBtn type="submit" color="primary" :disabled="!newKey.trim()">Add</VBtn>
        </form>
      </VCardText>
      <VCardActions><VSpacer /><VBtn @click="open = false">Close</VBtn></VCardActions>
    </VCard>
  </VDialog>
</template>

<style scoped>
.pages-button__label {
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.state-key {
  min-width: 90px;
}
</style>
