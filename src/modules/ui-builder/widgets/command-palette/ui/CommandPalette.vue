<script setup lang="ts">
import { computed, nextTick, ref, shallowRef, watch } from 'vue'
import { useStorage } from '@vueuse/core'
import { useUiTreeStore } from '../../../entities/ui-node'
import { buildCommands, type Command, type CommandHost } from '../model/commands'
import { searchCommands } from '../model/commandSearch'

/** One search box for everything: commands, components to add, pages, elements and settings of the selected element. */
const props = defineProps<{ modelValue: boolean; host: CommandHost }>()
const emit = defineEmits<{ 'update:modelValue': [open: boolean] }>()
const store = useUiTreeStore()

const MAX_RECENT = 5
const SUGGESTION_COUNT = 10
const recent = useStorage<string[]>('ui-builder:recent-commands', [])
const query = ref('')
const activeIndex = ref(0)
const commands = shallowRef<Command[]>([])
const input = ref<HTMLInputElement>()
const list = ref<HTMLElement>()

watch(
  () => props.modelValue,
  async open => {
    if (!open) return
    // Commands depend on what is selected and which page is open, so build them fresh each time.
    commands.value = buildCommands(store, props.host)
    query.value = ''
    activeIndex.value = 0
    await nextTick()
    input.value?.focus()
  },
)

const results = computed<Command[]>(() => {
  if (query.value.trim()) return searchCommands(commands.value, query.value)
  const byId = new Map(commands.value.map(command => [command.id, command]))
  const recents = recent.value.flatMap(id => (byId.has(id) ? [byId.get(id)!] : []))
  const suggestions = commands.value
    .filter(command => command.group !== 'Add component' && command.group !== 'Elements')
    .filter(command => !recents.includes(command))
    .slice(0, SUGGESTION_COUNT)
  return [...recents, ...suggestions]
})
const emptyQueryLabel = computed(() => (recent.value.length ? 'Recent and suggested' : 'Suggested'))
watch(results, () => (activeIndex.value = 0))

const close = () => emit('update:modelValue', false)
const run = async (command: Command) => {
  recent.value = [command.id, ...recent.value.filter(id => id !== command.id)].slice(0, MAX_RECENT)
  close()
  await nextTick()
  command.run()
}
const scrollActiveIntoView = async () => {
  await nextTick()
  list.value?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' })
}
const onKeydown = (event: KeyboardEvent) => {
  const count = results.value.length
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault()
    if (!count) return
    activeIndex.value = (activeIndex.value + (event.key === 'ArrowDown' ? 1 : -1) + count) % count
    scrollActiveIntoView()
  } else if (event.key === 'Enter') {
    event.preventDefault()
    const command = results.value[activeIndex.value]
    if (command) run(command)
  } else if (event.key === 'Home' || event.key === 'End') {
    if (!query.value) {
      event.preventDefault()
      activeIndex.value = event.key === 'Home' ? 0 : count - 1
      scrollActiveIntoView()
    }
  }
}
const optionId = (index: number) => `command-option-${index}`
</script>

<template>
  <VDialog
    :model-value="modelValue"
    max-width="620"
    content-class="command-dialog"
    aria-label="Command palette"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="command-palette">
      <div class="command-palette__search">
        <VIcon icon="mdi-magnify" size="20" aria-hidden="true" />
        <input
          ref="input"
          v-model="query"
          class="command-palette__input"
          type="text"
          role="combobox"
          aria-label="Search commands"
          aria-controls="command-list"
          aria-expanded="true"
          :aria-activedescendant="results.length ? optionId(activeIndex) : undefined"
          placeholder="Type a command, component, page or setting…"
          autocomplete="off"
          spellcheck="false"
          @keydown="onKeydown"
        />
        <kbd class="command-palette__kbd">Esc</kbd>
      </div>

      <div v-if="!query.trim()" class="command-palette__label">{{ emptyQueryLabel }}</div>
      <ul id="command-list" ref="list" class="command-palette__list" role="listbox" aria-label="Results">
        <li
          v-for="(command, index) in results"
          :id="optionId(index)"
          :key="command.id"
          class="command-option"
          :class="{ 'command-option--active': index === activeIndex }"
          role="option"
          :aria-selected="index === activeIndex"
          @mousemove="activeIndex = index"
          @click="run(command)"
        >
          <VIcon :icon="command.icon" size="18" class="command-option__icon" aria-hidden="true" />
          <span class="command-option__text">
            <span class="command-option__title">{{ command.title }}</span>
            <span v-if="command.subtitle" class="command-option__subtitle">{{ command.subtitle }}</span>
          </span>
          <kbd v-if="command.shortcut" class="command-palette__kbd">{{ command.shortcut }}</kbd>
          <span v-else class="command-option__group">{{ command.group }}</span>
        </li>
        <li v-if="!results.length" class="command-palette__empty" role="presentation">
          No commands match “{{ query }}”.
        </li>
      </ul>
      <div class="command-palette__footer" aria-hidden="true">
        <span><kbd>↑</kbd><kbd>↓</kbd> move</span>
        <span><kbd>Enter</kbd> run</span>
        <span><kbd>Esc</kbd> close</span>
      </div>
    </div>
  </VDialog>
</template>

<style>
/* Not scoped: the dialog content is rendered in an overlay outside this component. */
.command-dialog {
  align-self: flex-start;
  margin-top: 12vh !important;
}
.command-palette {
  display: flex;
  flex-direction: column;
  max-height: 70vh;
  overflow: hidden;
  border-radius: 12px;
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
}
.command-palette__search {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.2);
}
.command-palette__input {
  flex: 1;
  min-width: 0;
  font-size: 16px;
  outline: none;
  background: transparent;
  color: inherit;
}
.command-palette__label {
  padding: 8px 16px 2px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  opacity: 0.6;
}
.command-palette__list {
  flex: 1;
  min-height: 0;
  margin: 0;
  padding: 6px;
  overflow-y: auto;
  list-style: none;
}
.command-option {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 10px;
  border-radius: 8px;
  cursor: pointer;
}
.command-option--active {
  background: rgba(var(--v-theme-primary), 0.12);
}
.command-option__icon {
  flex-shrink: 0;
  opacity: 0.75;
}
.command-option__text {
  display: flex;
  flex: 1;
  min-width: 0;
  align-items: baseline;
  gap: 8px;
}
.command-option__title {
  overflow: hidden;
  font-size: 14px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.command-option__subtitle {
  overflow: hidden;
  font-size: 12px;
  opacity: 0.6;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.command-option__group {
  flex-shrink: 0;
  max-width: 130px;
  overflow: hidden;
  font-size: 11px;
  opacity: 0.55;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.command-palette kbd {
  padding: 1px 6px;
  border: 1px solid rgba(var(--v-border-color), 0.3);
  border-radius: 4px;
  background: rgba(var(--v-theme-on-surface), 0.05);
  font-family: inherit;
  font-size: 11px;
}
.command-palette__empty {
  padding: 24px 10px;
  text-align: center;
  font-size: 14px;
  opacity: 0.7;
}
.command-palette__footer {
  display: flex;
  gap: 16px;
  padding: 8px 16px;
  border-top: 1px solid rgba(var(--v-border-color), 0.2);
  font-size: 11px;
  opacity: 0.7;
}
.command-palette__footer kbd + kbd {
  margin-left: 2px;
}
</style>
