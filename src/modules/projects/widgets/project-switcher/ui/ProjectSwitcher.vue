<script setup lang="ts">
import { computed } from 'vue'
import { useUiTreeStore } from '../../../../ui-builder/entities/ui-node'
import type { ProjectSession } from '../../../features/manage-projects'
import { ProjectDialog } from '../model/projectDialog'

const MAX_RECENT_PROJECTS = 5

const props = defineProps<{ session: ProjectSession }>()
const emit = defineEmits<{ open: [dialog: ProjectDialog] }>()

const store = useUiTreeStore()
const currentName = computed(() => props.session.currentProject.value?.name ?? 'Project')
const recent = computed(() => props.session.projects.value.slice(0, MAX_RECENT_PROJECTS))
const open = async (id: string) => {
  try {
    await props.session.open(id)
  } catch {
    store.setNotice('Could not open the project. Try again.')
  }
}
const onToggle = (isOpen: boolean) => {
  if (isOpen) props.session.refresh()
}
</script>

<template>
  <VMenu location="bottom start" @update:model-value="onToggle">
    <template #activator="{ props: menu }">
      <VBtn
        v-bind="menu"
        size="small"
        variant="text"
        prepend-icon="mdi-folder-outline"
        append-icon="mdi-menu-down"
        :aria-label="`Project: ${currentName}`"
        :title="currentName"
      >
        <span class="project-switcher__name">{{ currentName }}</span>
      </VBtn>
    </template>
    <VList density="compact" aria-label="Projects" min-width="240" max-width="360">
      <VListItem
        v-for="project in recent"
        :key="project.id"
        :title="project.name"
        :active="project.id === session.currentProjectId.value"
        :append-icon="project.id === session.currentProjectId.value ? 'mdi-check' : undefined"
        color="primary"
        @click="open(project.id)"
      />
      <VDivider />
      <VListItem prepend-icon="mdi-plus" title="New project…" @click="emit('open', ProjectDialog.Create)" />
      <VListItem
        prepend-icon="mdi-folder-multiple-outline"
        title="All projects…"
        @click="emit('open', ProjectDialog.List)"
      />
    </VList>
  </VMenu>
</template>

<style scoped>
.project-switcher__name {
  display: inline-block;
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
@media (max-width: 700px) {
  .project-switcher__name {
    max-width: 80px;
  }
}
</style>
