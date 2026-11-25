<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useClipboard } from '@vueuse/core'
import { useUiTreeStore } from '../../../entities/ui-node'
import { downloadFile, downloadTextFile } from '../../../../../shared/lib/downloadTextFile'
import tableCss from '../../../../../shared/tableStyles.css?raw'
import { generateThemeCss, generateVuetifyConfig, useThemeSettings } from '../../../../theme/entities/theme-settings'
import { zipProject } from '../model/projectArchive'
import { buildVueProject, ExportBlockedError, namingProblem } from '../model/vueProject'
import { buildExportTargets, defaultTargetId, ExportTargetKind } from '../model/exportTargets'

const COPIED_MESSAGE_MS = 2000
const KIND_HEADINGS: Record<ExportTargetKind, string> = {
  [ExportTargetKind.Page]: 'Pages',
  [ExportTargetKind.Layout]: 'Layout',
  [ExportTargetKind.Component]: 'Components',
}
const NOTES = [
  'The whole project is a ready Vue app: pages with routes, shared variables in a Pinia store, saved components and the theme.',
  'A single file works with Vue 3 and Vuetify and has its own copy of the variables.',
  'Input masks are not exported, and neither are the editor-only table looks beyond their CSS classes (add shared/tableStyles.css).',
]

const props = defineProps<{ projectName: string }>()
const open = defineModel<boolean>({ required: true })
const { settings } = useThemeSettings()
const failure = ref('')

const downloadProject = () => {
  failure.value = ''
  try {
    const exported = buildVueProject({
      name: props.projectName,
      project: store.project,
      prefabs: store.prefabs,
      vuetifyConfig: generateVuetifyConfig(settings.value),
      themeCss: generateThemeCss(settings.value),
      tableCss,
    })
    downloadFile(`${exported.name}.zip`, new Uint8Array(zipProject(exported)), 'application/zip')
  } catch (error) {
    if (error instanceof ExportBlockedError) {
      failure.value = error.message
      return
    }
    // Unexpected: the person gets a short message, the cause stays in the console for a bug report.
    console.error(error)
    failure.value = 'Could not build the project archive.'
  }
}
const store = useUiTreeStore()
const { copy, copied } = useClipboard({ copiedDuring: COPIED_MESSAGE_MS })

const targets = computed(() => buildExportTargets(store.project, store.prefabs))
const warning = computed(() => namingProblem(store.project, store.prefabs))
const selectedId = ref('')
const selected = computed(() => targets.value.find(target => target.id === selectedId.value) ?? targets.value[0])

// Each time the dialog opens it starts on what is being edited, not on what was looked at last time.
watch(open, isOpen => {
  if (isOpen)
    selectedId.value = defaultTargetId({
      prefab: store.editingPrefab,
      layout: store.editingLayout,
      page: store.activePage,
    })
})

const items = computed(() =>
  Object.values(ExportTargetKind).flatMap(kind => {
    const ofKind = targets.value.filter(target => target.kind === kind)
    return ofKind.length
      ? [
          { type: 'subheader' as const, title: KIND_HEADINGS[kind] },
          ...ofKind.map(target => ({ title: target.title, subtitle: target.file.fileName, value: target.id })),
        ]
      : []
  }),
)

const download = () =>
  selected.value && downloadTextFile(selected.value.file.fileName, selected.value.file.code, 'text/plain')
</script>

<template>
  <VDialog v-model="open" max-width="900" scrollable>
    <VCard aria-label="Export code">
      <VCardTitle class="d-flex align-center">
        Export code
        <VSpacer />
        <VBtn icon="mdi-close" variant="text" size="small" aria-label="Close" @click="open = false" />
      </VCardTitle>
      <VCardText class="d-flex flex-column ga-3">
        <VSelect
          :model-value="selected?.id"
          :items="items"
          item-title="title"
          item-value="value"
          label="What to export"
          variant="outlined"
          density="compact"
          hide-details
          @update:model-value="id => (selectedId = String(id))"
        />
        <VAlert v-if="warning" type="warning" variant="tonal" density="compact">{{ warning }}</VAlert>
        <pre v-if="selected" class="code-export__code" tabindex="0" aria-label="Generated code">{{
          selected.file.code
        }}</pre>
        <ul class="code-export__notes text-caption text-medium-emphasis">
          <li v-for="note in NOTES" :key="note">{{ note }}</li>
        </ul>
      </VCardText>
      <VAlert v-if="failure" type="error" variant="tonal" density="compact" class="mx-4">{{ failure }}</VAlert>
      <VCardActions class="flex-wrap ga-2">
        <VBtn prepend-icon="mdi-folder-zip-outline" variant="tonal" color="primary" @click="downloadProject">
          Download project (.zip)
        </VBtn>
        <VSpacer />
        <VBtn prepend-icon="mdi-download" @click="download">Download {{ selected?.file.fileName }}</VBtn>
        <VBtn
          color="primary"
          variant="flat"
          :prepend-icon="copied ? 'mdi-check' : 'mdi-content-copy'"
          @click="selected && copy(selected.file.code)"
        >
          {{ copied ? 'Copied' : 'Copy code' }}
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>

<style scoped>
.code-export__code {
  max-height: 50vh;
  margin: 0;
  padding: 12px;
  overflow: auto;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.8rem;
  line-height: 1.5;
  white-space: pre;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 8px;
  background: rgba(var(--v-theme-on-surface), 0.04);
}
.code-export__notes {
  margin: 0;
  padding-left: 18px;
}
</style>
