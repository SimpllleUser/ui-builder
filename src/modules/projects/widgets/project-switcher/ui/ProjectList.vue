<script setup lang="ts">
import type { ProjectDetails } from '../../../features/manage-projects'

defineProps<{ projects: ProjectDetails[]; currentId: string | null }>()
const emit = defineEmits<{
  open: [project: ProjectDetails]
  rename: [project: ProjectDetails]
  duplicate: [project: ProjectDetails]
  export: [project: ProjectDetails]
  delete: [project: ProjectDetails]
}>()

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })
const describe = ({ pageCount, updatedAt }: ProjectDetails) => {
  const pages = pageCount === null ? 'Damaged: export it to keep a copy' : `Pages: ${pageCount}`
  return `${pages} · changed ${dateFormat.format(updatedAt)}`
}
</script>

<template>
  <VList class="pa-0" aria-label="All projects">
    <VListItem
      v-for="project in projects"
      :key="project.id"
      :title="project.name"
      :subtitle="describe(project)"
      :active="project.id === currentId"
      color="primary"
      class="px-2"
      @click="emit('open', project)"
    >
      <template #append>
        <VBtn
          icon="mdi-pencil-outline"
          variant="text"
          size="small"
          :aria-label="`Rename ${project.name}`"
          title="Rename"
          @click.stop="emit('rename', project)"
        />
        <VBtn
          icon="mdi-content-copy"
          variant="text"
          size="small"
          :disabled="project.pageCount === null"
          :aria-label="`Duplicate ${project.name}`"
          title="Duplicate"
          @click.stop="emit('duplicate', project)"
        />
        <VBtn
          icon="mdi-export"
          variant="text"
          size="small"
          :aria-label="`Export ${project.name}`"
          title="Export"
          @click.stop="emit('export', project)"
        />
        <VBtn
          icon="mdi-delete-outline"
          variant="text"
          size="small"
          color="error"
          :aria-label="`Delete ${project.name}`"
          title="Delete"
          @click.stop="emit('delete', project)"
        />
      </template>
    </VListItem>
  </VList>
</template>
