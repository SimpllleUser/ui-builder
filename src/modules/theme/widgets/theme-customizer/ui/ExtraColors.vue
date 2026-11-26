<script setup lang="ts">
import { computed, ref } from 'vue'
import { extraColorNameError, MAX_EXTRA_COLORS, useThemeSettings } from '../../../entities/theme-settings'
import { inputValue } from '../../../../../shared/lib/dom'

const NEW_COLOR = '#1B3FD1'

/** The project's own colours: each gets a name to pick it by. */
const { settings } = useThemeSettings()
const colors = computed(() => Object.entries(settings.value.extraColors))
const name = ref('')
const color = ref(NEW_COLOR)
const full = computed(() => colors.value.length >= MAX_EXTRA_COLORS)
const error = computed(() => {
  if (!name.value) return ''
  if (name.value in settings.value.extraColors) return `There is a colour called “${name.value}” already.`
  return extraColorNameError(name.value) ?? ''
})

// The table is replaced, not changed in place: the default settings share an empty one.
const save = (key: string, value: string) => {
  settings.value = { ...settings.value, extraColors: { ...settings.value.extraColors, [key]: value } }
}
const remove = (key: string) => {
  const { [key]: _removed, ...rest } = settings.value.extraColors
  settings.value = { ...settings.value, extraColors: rest }
}
const add = () => {
  if (!name.value || error.value || full.value) return
  save(name.value, color.value)
  name.value = ''
}
</script>

<template>
  <ul v-if="colors.length" class="extra-colors">
    <li v-for="[key, value] in colors" :key="key" class="extra-colors__item">
      <input type="color" :value="value" :aria-label="`Colour ${key}`" @input="save(key, inputValue($event))" />
      <span class="extra-colors__name">{{ key }}</span>
      <VBtn icon="mdi-close" variant="text" size="x-small" :aria-label="`Remove ${key}`" @click="remove(key)" />
    </li>
  </ul>
  <p v-if="full" class="text-caption text-medium-emphasis">A theme has at most {{ MAX_EXTRA_COLORS }} of its own.</p>
  <form v-else class="extra-colors__add" @submit.prevent="add">
    <input v-model="color" type="color" aria-label="New colour" />
    <VTextField
      v-model.trim="name"
      label="Name, such as cobalt"
      variant="outlined"
      density="compact"
      :error-messages="error"
      hide-details="auto"
    />
    <VBtn type="submit" variant="tonal" size="small" :disabled="!name || !!error">Add</VBtn>
  </form>
</template>

<style scoped>
.extra-colors {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0 0 12px;
  padding: 0;
  list-style: none;
}
.extra-colors__item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 2px 4px 2px 8px;
  border: 1px solid rgba(var(--v-border-color), 0.25);
  border-radius: 16px;
}
.extra-colors__name {
  font-size: 13px;
}
.extra-colors__add {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}
input[type='color'] {
  width: 32px;
  height: 28px;
  flex-shrink: 0;
  margin-top: 4px;
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;
}
.extra-colors__item input[type='color'] {
  width: 24px;
  height: 20px;
  margin-top: 0;
}
</style>
