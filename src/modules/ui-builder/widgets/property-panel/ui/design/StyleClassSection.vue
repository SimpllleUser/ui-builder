<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  appliedStyleClasses,
  hasShareableStyle,
  styleClassNameError,
  useUiTreeStore,
  type UiNode,
} from '../../../../entities/ui-node'
import StyleOverrideNotice from '../StyleOverrideNotice.vue'
import DesignSection from './DesignSection.vue'

/** Styles shared by several elements: make one from this element's style, use it, change it or delete it. */
const props = defineProps<{ node: UiNode }>()
const store = useUiTreeStore()

const classes = computed(() => store.project.styleClasses ?? {})
const applied = computed(() => appliedStyleClasses(props.node, classes.value))
const available = computed(() => Object.keys(classes.value).filter(name => !applied.value.includes(name)))
const canSave = computed(() => hasShareableStyle(props.node))

const newName = ref('')
const nameError = ref('')
const typeName = (value: string) => {
  newName.value = value
  nameError.value = value ? (styleClassNameError(classes.value, value) ?? '') : ''
}
const save = () => {
  nameError.value = store.createStyleClass(props.node.id, newName.value) ?? ''
  if (!nameError.value) newName.value = ''
}
const apply = (name: string | null) => name && store.applyStyleClass(props.node.id, name)
const summary = (name: string) =>
  Object.entries(classes.value[name])
    .map(([property, value]) => `${property}: ${value.replace(' !important', '')}`)
    .join('; ')
</script>

<template>
  <DesignSection title="Style classes">
    <ul v-if="applied.length" class="class-list">
      <li v-for="name in applied" :key="name" class="class-row">
        <span class="class-row__name" :title="summary(name)">{{ name }}</span>
        <VBtn
          icon="mdi-tray-arrow-up"
          size="x-small"
          variant="text"
          :disabled="!canSave"
          :aria-label="`Add this element's style to ${name}`"
          :title="`Add this element's style to ${name} (changes every element using it)`"
          @click="store.updateStyleClass(node.id, name)"
        />
        <VBtn
          icon="mdi-close"
          size="x-small"
          variant="text"
          :aria-label="`Remove ${name} from this element`"
          :title="`Remove from this element`"
          @click="store.removeStyleClass(node.id, name)"
        />
        <VBtn
          icon="mdi-delete-outline"
          size="x-small"
          variant="text"
          color="error"
          :aria-label="`Delete class ${name}`"
          title="Delete the class from the project and every element"
          @click="store.deleteStyleClass(name)"
        />
      </li>
    </ul>

    <VSelect
      v-if="available.length"
      :model-value="null"
      :items="available"
      label="Use an existing class"
      variant="outlined"
      density="compact"
      hide-details
      class="mb-2"
      @update:model-value="apply"
    />

    <form class="class-form" @submit.prevent="save">
      <VTextField
        :model-value="newName"
        label="New class name"
        placeholder="card-accent"
        variant="outlined"
        density="compact"
        :disabled="!canSave"
        :error-messages="nameError"
        hide-details="auto"
        @update:model-value="typeName"
      />
      <VBtn type="submit" size="small" variant="tonal" color="primary" :disabled="!canSave || !newName">Save</VBtn>
    </form>
    <p class="class-hint">
      {{
        canSave
          ? 'Saving moves the element’s own style (for all sizes) into the class.'
          : 'Set something below, then save it as a class to reuse it.'
      }}
    </p>
    <StyleOverrideNotice :node="node" />
  </DesignSection>
</template>

<style scoped>
.class-list {
  margin: 0 0 8px;
  padding: 0;
  list-style: none;
}
.class-row {
  display: flex;
  align-items: center;
  gap: 2px;
}
.class-row__name {
  flex: 1;
  min-width: 0;
  font-size: 12px;
  font-weight: 600;
  overflow-wrap: anywhere;
}
.class-form {
  display: flex;
  align-items: flex-start;
  gap: 6px;
}
.class-form button {
  margin-top: 6px;
}
.class-hint {
  margin: 4px 0 8px;
  font-size: 12px;
  opacity: 0.6;
}
</style>
