<script setup lang="ts">
import { computed, inject, nextTick, ref, watch } from 'vue'
import { refDebounced } from '@vueuse/core'
import {
  conditionError,
  conditionVariables,
  repeatScopeNames,
  StartingOutcome,
  startingOutcome,
  useUiTreeStore,
  type UiNode,
} from '../../../entities/ui-node'
import { OPEN_CONDITIONS_HELP } from '../../../../../shared/lib/conditionsHelp'
import { useCheckedDrafts } from '../../../../../shared/lib/useCheckedDrafts'
import { FUNCTION_SNIPPETS, insertAtCaret, variableSnippet, type ConditionSnippet } from '../model/conditionInsert'
import { useEnsureVariable } from '../model/useEnsureVariable'

const FIELD = 'condition'
/** A pause in typing after which an unfinished condition is pointed out; sooner would nag while the person is mid-word. */
const HINT_DELAY_MS = 700
const NEW_VARIABLE_VALUE = false

const props = defineProps<{ node: UiNode }>()
const store = useUiTreeStore()
const ensureVariable = useEnsureVariable(store)
const openConditionsHelp = inject(OPEN_CONDITIONS_HELP, undefined)

// A condition that cannot be read stays in the field with the reason; it would otherwise be ignored silently.
const drafts = useCheckedDrafts(
  (_field, value) => conditionError(value),
  (_field, value) => {
    conditionVariables(value).forEach(name => ensureVariable(name, NEW_VARIABLE_VALUE))
    store.updateNodeLogic(props.node.id, { vIf: value })
  },
)
watch(() => props.node.id, drafts.reset)

const typed = computed(() => drafts.shown(FIELD, props.node.vIf))
const settled = refDebounced(typed, HINT_DELAY_MS)
// The reason is also shown by the field itself once the person leaves it; this one is the early, gentler version.
const unfinishedReason = computed(() =>
  drafts.errorOf(FIELD).length || !conditionError(typed.value) ? null : conditionError(settled.value),
)
const outcome = computed(() => startingOutcome(typed.value, store.project.state))

const snippets = computed<ConditionSnippet[]>(() => [
  ...repeatScopeNames(props.node, store.findParentAndIndex).map(name =>
    variableSnippet(name, 'Exists inside this repeat or table cell'),
  ),
  ...Object.keys(store.project.state).map(name => variableSnippet(name, 'Project variable')),
])

const field = ref<{ $el: HTMLElement } | null>(null)
const inputElement = () => field.value?.$el.querySelector('input') ?? null
const insert = async (snippet: ConditionSnippet) => {
  const input = inputElement()
  const start = input?.selectionStart ?? typed.value.length
  const edit = insertAtCaret(typed.value, start, input?.selectionEnd ?? start, snippet)
  drafts.edit(FIELD, edit.text)
  await nextTick()
  input?.focus()
  input?.setSelectionRange(edit.caret, edit.caret)
}
</script>

<template>
  <VTextField
    ref="field"
    :model-value="typed"
    :error-messages="drafts.errorOf(FIELD)"
    label="Condition"
    placeholder='isOpen, !loading, step >= 2 and role == "admin"'
    variant="outlined"
    density="compact"
    hide-details="auto"
    spellcheck="false"
    @update:model-value="value => drafts.edit(FIELD, value)"
    @blur="drafts.commit(FIELD)"
    @keydown.enter="drafts.commit(FIELD)"
  >
    <template v-if="openConditionsHelp" #append-inner>
      <VBtn
        icon="mdi-help-circle-outline"
        size="x-small"
        variant="text"
        aria-label="How conditions work"
        title="How conditions work"
        @click="openConditionsHelp"
      />
    </template>
  </VTextField>

  <p v-if="unfinishedReason" class="condition-note text-caption text-warning" role="status">
    <VIcon icon="mdi-pencil-outline" size="14" aria-hidden="true" />
    Not finished yet: {{ unfinishedReason }}
  </p>
  <p
    v-else-if="outcome"
    class="condition-note text-caption"
    :class="outcome === StartingOutcome.Shown ? 'text-success' : 'text-medium-emphasis'"
    aria-live="polite"
  >
    <VIcon
      :icon="outcome === StartingOutcome.Shown ? 'mdi-eye-outline' : 'mdi-eye-off-outline'"
      size="14"
      aria-hidden="true"
    />
    With the variables' starting values, this element is
    <strong>{{ outcome === StartingOutcome.Shown ? 'shown' : 'hidden' }}</strong> in Preview.
  </p>

  <div class="condition-insert" role="group" aria-label="Insert into the condition">
    <span class="text-caption text-medium-emphasis">Insert</span>
    <!-- Pressing a chip must not take focus from the field, or the half-typed condition would be checked and saved first. -->
    <VChip
      v-for="snippet in snippets"
      :key="`variable:${snippet.name}`"
      size="small"
      label
      prepend-icon="mdi-variable"
      :title="snippet.hint"
      @mousedown.prevent
      @click="insert(snippet)"
    >
      {{ snippet.text }}
    </VChip>
    <VChip
      v-for="snippet in FUNCTION_SNIPPETS"
      :key="`function:${snippet.name}`"
      size="small"
      label
      variant="outlined"
      prepend-icon="mdi-function"
      :title="snippet.hint"
      @mousedown.prevent
      @click="insert(snippet)"
    >
      {{ snippet.text }}
    </VChip>
  </div>
</template>

<style scoped>
.condition-note {
  display: flex;
  align-items: center;
  gap: 4px;
  margin: 6px 0 0;
}
.condition-insert {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  margin-top: 8px;
}
</style>
