<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  defaultTemplateProps,
  emptyListEntry,
  presetTemplateProps,
  templatePresets,
  TEMPLATE_SETTINGS,
  TEMPLATES,
  TemplateSettingKind,
  type TemplateKind,
  type TemplateProps,
  type TemplateSetting,
  type TextRecord,
} from '../../../entities/ui-node'

const props = defineProps<{ kind: TemplateKind | null }>()
const emit = defineEmits<{ cancel: []; submit: [kind: TemplateKind, settings: TemplateProps] }>()

const values = ref<TemplateProps>({})
const settings = computed<TemplateSetting[]>(() => (props.kind ? (TEMPLATE_SETTINGS[props.kind] ?? []) : []))
const title = computed(() => TEMPLATES.find(template => template.kind === props.kind)?.label ?? '')

const presets = computed(() => (props.kind ? templatePresets(props.kind) : []))
const presetId = ref<string | null>(null)

watch(
  () => props.kind,
  kind => {
    values.value = kind ? defaultTemplateProps(kind) : {}
    presetId.value = presets.value[0]?.id ?? null
  },
  { immediate: true },
)

// A preset replaces what is in the form; the fields stay editable afterwards.
function choosePreset(id: unknown) {
  if (!props.kind || typeof id !== 'string') return
  presetId.value = id
  values.value = presetTemplateProps(props.kind, id)
}

function textValue(key: string): string {
  const value = values.value[key]
  return typeof value === 'string' ? value : ''
}

function entries(key: string): TextRecord[] {
  const value = values.value[key]
  return Array.isArray(value) ? value : []
}

function setText(key: string, value: unknown) {
  if (typeof value === 'string') values.value = { ...values.value, [key]: value }
}

function setEntryField(key: string, index: number, field: string, value: unknown) {
  if (typeof value !== 'string') return
  values.value = {
    ...values.value,
    [key]: entries(key).map((entry, position) => (position === index ? { ...entry, [field]: value } : entry)),
  }
}

function addEntry(setting: TemplateSetting) {
  if (setting.kind !== TemplateSettingKind.List) return
  values.value = { ...values.value, [setting.key]: [...entries(setting.key), emptyListEntry(setting)] }
}

function removeEntry(key: string, index: number) {
  values.value = { ...values.value, [key]: entries(key).filter((_, position) => position !== index) }
}

const submit = () => {
  if (props.kind) emit('submit', props.kind, values.value)
}
</script>

<template>
  <VDialog :model-value="kind !== null" max-width="560" scrollable @update:model-value="emit('cancel')">
    <VCard :title="`Add ${title}`" subtitle="Change the content now or edit it on the canvas later.">
      <VCardText>
        <div v-if="presets.length" class="mb-4">
          <div class="text-subtitle-2 mb-2">Preset</div>
          <VBtnToggle
            :model-value="presetId"
            mandatory
            divided
            density="comfortable"
            color="primary"
            variant="outlined"
            @update:model-value="choosePreset"
          >
            <VBtn v-for="preset in presets" :key="preset.id" :value="preset.id" size="small">{{ preset.label }}</VBtn>
          </VBtnToggle>
        </div>
        <template v-for="setting in settings" :key="setting.key">
          <VTextField
            v-if="setting.kind === TemplateSettingKind.Text"
            :model-value="textValue(setting.key)"
            :label="setting.label"
            variant="outlined"
            density="compact"
            hide-details
            class="mb-3"
            @update:model-value="setText(setting.key, $event)"
          />
          <section v-else class="mb-3">
            <div class="text-subtitle-2 mb-2">{{ setting.label }}</div>
            <VCard
              v-for="(entry, index) in entries(setting.key)"
              :key="index"
              variant="outlined"
              class="pa-3 mb-2"
              :aria-label="`${setting.label} ${index + 1}`"
            >
              <VTextField
                v-for="field in setting.fields"
                :key="field.key"
                :model-value="entry[field.key] ?? ''"
                :label="field.label"
                variant="outlined"
                density="compact"
                hide-details
                class="mb-2"
                @update:model-value="setEntryField(setting.key, index, field.key, $event)"
              />
              <VBtn
                size="small"
                variant="text"
                color="error"
                prepend-icon="mdi-delete-outline"
                @click="removeEntry(setting.key, index)"
                >Remove</VBtn
              >
            </VCard>
            <VBtn size="small" variant="tonal" prepend-icon="mdi-plus" @click="addEntry(setting)">Add</VBtn>
          </section>
        </template>
      </VCardText>
      <VCardActions>
        <VSpacer />
        <VBtn @click="emit('cancel')">Cancel</VBtn>
        <VBtn color="primary" variant="flat" @click="submit">Add to page</VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>
