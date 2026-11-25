<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { projectFileName } from '../../../entities/project'
import type { ProjectDetails, ProjectSession } from '../../../features/manage-projects'
import { downloadTextFile } from '../../../../../shared/lib/downloadTextFile'
import { ProjectDialog } from '../model/projectDialog'
import { useAttempt } from '../model/useAttempt'
import ProjectList from './ProjectList.vue'
import ProjectNameDialog from './ProjectNameDialog.vue'

const props = defineProps<{ session: ProjectSession }>()
const dialog = defineModel<ProjectDialog | null>({ required: true })

const details = ref<ProjectDetails[]>([])
const renaming = ref<ProjectDetails | null>(null)
const deleting = ref<ProjectDetails | null>(null)
const { failure, attempt } = useAttempt()
const currentId = computed(() => props.session.currentProjectId.value)

const reload = async () => {
  details.value = await props.session.listDetails()
}
watch(dialog, value => {
  failure.value = ''
  if (value === ProjectDialog.List) attempt(reload)
  if (value === ProjectDialog.Create) attempt(() => props.session.refresh())
})

const close = () => (dialog.value = null)
const open = (project: ProjectDetails) =>
  attempt(async () => {
    if (await props.session.open(project.id)) close()
    else failure.value = `Could not open “${project.name}”.`
  })
const create = (name: string) => {
  dialog.value = null
  attempt(() => props.session.create(name))
}
const rename = (name: string) => {
  const project = renaming.value
  renaming.value = null
  if (!project) return
  attempt(async () => {
    await props.session.rename(project.id, name)
    await reload()
  })
}
const duplicate = (project: ProjectDetails) =>
  attempt(async () => {
    await props.session.duplicate(project.id)
    await reload()
  })
const exportProject = (project: ProjectDetails) =>
  attempt(async () => {
    const text = await props.session.exportFile(project.id)
    downloadTextFile(projectFileName(project.name), text, 'application/json')
  })
const remove = () => {
  const project = deleting.value
  deleting.value = null
  if (!project) return
  attempt(async () => {
    await props.session.remove(project.id)
    await reload()
  })
}
</script>

<template>
  <VDialog :model-value="dialog === ProjectDialog.List" max-width="640" scrollable @update:model-value="close">
    <VCard title="All projects">
      <VCardText>
        <VAlert v-if="failure" type="error" variant="tonal" density="compact" class="mb-3">{{ failure }}</VAlert>
        <ProjectList
          :projects="details"
          :current-id="currentId"
          @open="open"
          @rename="renaming = $event"
          @duplicate="duplicate"
          @export="exportProject"
          @delete="deleting = $event"
        />
      </VCardText>
      <VCardActions>
        <VBtn prepend-icon="mdi-plus" @click="dialog = ProjectDialog.Create">New project…</VBtn>
        <VSpacer />
        <VBtn @click="close">Close</VBtn>
      </VCardActions>
    </VCard>
  </VDialog>

  <ProjectNameDialog
    v-if="dialog === ProjectDialog.Create"
    title="New project"
    action="Create"
    :projects="session.projects.value"
    @submit="create"
    @cancel="close"
  />
  <ProjectNameDialog
    v-if="renaming"
    title="Rename project"
    action="Rename"
    :projects="session.projects.value"
    :initial-name="renaming.name"
    :own-id="renaming.id"
    @submit="rename"
    @cancel="renaming = null"
  />
  <VDialog :model-value="deleting !== null" max-width="420" @update:model-value="deleting = null">
    <VCard v-if="deleting" :title="`Delete “${deleting.name}”?`">
      <VCardText> Its pages, checkpoints and theme are removed from this browser. This cannot be undone. </VCardText>
      <VCardActions>
        <VBtn prepend-icon="mdi-export" @click="exportProject(deleting)">Export first</VBtn>
        <VSpacer />
        <VBtn @click="deleting = null">Cancel</VBtn>
        <VBtn color="error" variant="tonal" @click="remove">Delete</VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>
