<script setup lang="ts">
import { ActionType } from '../../../entities/ui-node/model/enums'
import { BehaviorKind } from '../model/behaviorKinds'
import { computed, ref, watch } from 'vue'
import { useUiTreeStore } from '../../../entities/ui-node/model/store'
import { conditionError } from '../../../entities/ui-node/model/runtime'
import type { UiAction, UiNode } from '../../../entities/ui-node/model/types'
import { useCheckedDrafts } from '../../../model/useCheckedDrafts'
import VariableField from './VariableField.vue'

const props = defineProps<{ node: UiNode }>()
const store = useUiTreeStore()

const isTable = computed(() => props.node.type === 'VDataTable')
const behaviors: Record<BehaviorKind, { title: () => string; description: string; hint: string }> = {
  [BehaviorKind.Click]: {
    title: () => (isTable.value ? 'When a row is clicked' : 'When clicked'),
    description: 'Go to a page or change a variable',
    hint: 'on click',
  },
  [BehaviorKind.VIf]: {
    title: () => 'Show only when…',
    description: 'Hide it until a condition is true',
    hint: 'v-if',
  },
  [BehaviorKind.Model]: {
    title: () => 'Link to a variable',
    description: 'Keep an input and a variable in sync',
    hint: 'v-model',
  },
  [BehaviorKind.VFor]: {
    title: () => 'Repeat for each item',
    description: 'One copy for every item of a list',
    hint: 'v-for',
  },
}
const kinds = Object.values(BehaviorKind)

const action = computed<UiAction | undefined>(() => props.node.events?.click)
const isSet = (kind: BehaviorKind) => (kind === BehaviorKind.Click ? !!action.value : !!props.node[kind])
// A behavior that was just added stays visible even though it is still empty.
const added = ref<BehaviorKind[]>([])
watch(
  () => props.node.id,
  () => (added.value = []),
)
const active = computed(() => kinds.filter(kind => isSet(kind) || added.value.includes(kind)))
const available = computed(() => kinds.filter(kind => !active.value.includes(kind)))

const setLogic = (patch: Parameters<typeof store.updateNodeLogic>[1]) => store.updateNodeLogic(props.node.id, patch)
const addBehavior = (kind: BehaviorKind) => {
  added.value = [...added.value, kind]
}
const removeBehavior = (kind: BehaviorKind) => {
  added.value = added.value.filter(item => item !== kind)
  if (kind === BehaviorKind.Click) setLogic({ events: undefined })
  else setLogic({ [kind]: '' })
}

// Variables are created where they are first used, with a starting value that fits the use.
const ensureVariable = (name: string, initial: unknown) => {
  const trimmed = name.trim()
  if (!trimmed || trimmed in store.project.state) return
  if (store.setStateVariable(trimmed, initial))
    store.setNotice(`Created variable “${trimmed}”. Change its starting value under the field.`)
}
const setVariableLogic = (kind: BehaviorKind.Model | BehaviorKind.VFor, name: string) => {
  ensureVariable(name, kind === BehaviorKind.VFor ? [] : '')
  setLogic({ [kind]: name })
}
// A condition that cannot be read stays in the field with the reason; it would otherwise be ignored silently.
const condition = useCheckedDrafts(
  (_field, value) => conditionError(value),
  (_field, value) => setCondition(value),
)
watch(() => props.node.id, condition.reset)
const setCondition = (expression: string) => {
  const root = /^\s*!?\s*([A-Za-z_$][\w$]*)/.exec(expression)?.[1]
  if (root) ensureVariable(root, false)
  setLogic({ vIf: expression })
}

const stateKeys = computed(() => Object.keys(store.project.state))
// The field keeps the item's title, so the title must be the route itself; the page name goes in the subtitle.
const pageItems = computed(() => store.pages.map(page => ({ title: page.path, subtitle: page.name, value: page.path })))
// Going to a route no page has would do nothing in Preview; say so next to the field.
const routeProblem = computed(() => {
  const to = action.value?.type === ActionType.Navigate ? action.value.to.trim() : ''
  if (!to || to.includes('{{') || store.pages.some(page => page.path === to)) return null
  return 'No page has this route yet. Pick a page from the list or add one.'
})
const actionType = computed(() => action.value?.type ?? 'none')
const actionTypes = [
  { title: 'Nothing', value: 'none' },
  { title: 'Go to page', value: ActionType.Navigate },
  { title: 'Set a variable', value: ActionType.Set },
  { title: 'Switch a variable on/off', value: ActionType.Toggle },
]
const setClick = (click: UiAction | undefined) => setLogic({ events: click ? { click } : undefined })
const changeType = (type: string) => {
  if (type === ActionType.Navigate) setClick({ type, to: store.pages[0]?.path ?? '/' })
  else if (type === ActionType.Set) setClick({ type, key: stateKeys.value[0] ?? '', value: 'true' })
  else if (type === ActionType.Toggle) setClick({ type, key: stateKeys.value[0] ?? '' })
  else setClick(undefined)
}
const patchAction = (patch: Partial<UiAction>) => {
  if (action.value) setClick({ ...action.value, ...patch } as UiAction)
}
const setActionVariable = (name: string) => {
  ensureVariable(name, action.value?.type === ActionType.Toggle ? false : '')
  patchAction({ key: name })
}
</script>

<template>
  <section class="behavior" aria-label="Behavior">
    <div class="d-flex align-center mt-6 mb-2">
      <div class="text-overline text-primary font-weight-bold" title="Behavior runs in Preview">Behavior</div>
      <VSpacer />
      <VMenu v-if="available.length" location="bottom end">
        <template #activator="{ props: menu }">
          <VBtn v-bind="menu" size="small" variant="tonal" color="primary" prepend-icon="mdi-plus">Add</VBtn>
        </template>
        <VList density="compact">
          <VListItem
            v-for="kind in available"
            :key="kind"
            :title="behaviors[kind].title()"
            :subtitle="behaviors[kind].description"
            :aria-label="`Add: ${behaviors[kind].title()}`"
            @click="addBehavior(kind)"
          />
        </VList>
      </VMenu>
    </div>

    <p v-if="!active.length" class="text-caption text-medium-emphasis">
      Nothing yet. Add a behavior so this element reacts in Preview: open a page, show or hide itself, repeat for a
      list.
    </p>

    <div v-for="kind in active" :key="kind" class="behavior-card" :data-behavior="kind">
      <div class="behavior-card__head">
        <span class="behavior-card__title" :title="behaviors[kind].hint">{{ behaviors[kind].title() }}</span>
        <VBtn
          icon="mdi-close"
          size="x-small"
          variant="text"
          :aria-label="`Remove: ${behaviors[kind].title()}`"
          title="Remove"
          @click="removeBehavior(kind)"
        />
      </div>

      <template v-if="kind === BehaviorKind.Click">
        <VSelect
          :model-value="actionType"
          :items="actionTypes"
          label="Then"
          variant="outlined"
          density="compact"
          hide-details
          class="mb-3"
          @update:model-value="changeType"
        />
        <VCombobox
          v-if="action?.type === ActionType.Navigate"
          :model-value="action.to"
          :items="pageItems"
          item-title="title"
          item-value="value"
          :return-object="false"
          label="Page"
          :error-messages="routeProblem ?? []"
          variant="outlined"
          density="compact"
          hide-details="auto"
          @update:model-value="value => patchAction({ to: String(value ?? '') })"
        />
        <template v-else-if="action">
          <VariableField label="Variable" :model-value="action.key" @update:model-value="setActionVariable" />
          <VTextField
            v-if="action.type === ActionType.Set"
            :model-value="action.value"
            :label="isTable ? 'New value — {{ item.id }} is the clicked row' : 'New value (true, 3, text)'"
            variant="outlined"
            density="compact"
            hide-details
            class="mt-3"
            @update:model-value="value => patchAction({ value: value ?? '' })"
          />
        </template>
      </template>

      <VTextField
        v-else-if="kind === BehaviorKind.VIf"
        :model-value="condition.shown('condition', node.vIf)"
        :error-messages="condition.errorOf('condition')"
        label="Condition"
        placeholder="isOpen, !loading, status == paid, step >= 2"
        variant="outlined"
        density="compact"
        hide-details="auto"
        @update:model-value="value => condition.edit('condition', value)"
        @blur="condition.commit('condition')"
        @keydown.enter="condition.commit('condition')"
      />

      <VariableField
        v-else-if="kind === BehaviorKind.Model"
        label="Variable"
        :model-value="node.model"
        @update:model-value="name => setVariableLogic(BehaviorKind.Model, name)"
      />

      <VariableField
        v-else-if="kind === BehaviorKind.VFor"
        label="List variable"
        hint="Inside, show a value with {{ item.title }}"
        :model-value="node.vFor"
        @update:model-value="name => setVariableLogic(BehaviorKind.VFor, name)"
      />
    </div>
  </section>
</template>

<style scoped>
.behavior-card {
  margin-bottom: 10px;
  padding: 8px 10px 12px;
  border: 1px solid rgba(var(--v-border-color), 0.2);
  border-radius: 8px;
}
.behavior-card__head {
  display: flex;
  align-items: center;
  margin-bottom: 6px;
}
.behavior-card__title {
  flex: 1;
  font-size: 13px;
  font-weight: 600;
}
</style>
