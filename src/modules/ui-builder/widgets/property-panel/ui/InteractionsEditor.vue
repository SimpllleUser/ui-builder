<script setup lang="ts">
import {
  ClickEvent,
  clickEventOf,
  EVENT_LABELS,
  EventName,
  eventsFor,
  hasValidation,
  useUiTreeStore,
  withActions,
  actionsOf,
  type UiNode,
} from '../../../entities/ui-node'
import { BehaviorKind, EVENT_OF_KIND } from '../model/behaviorKinds'
import { computed, ref, watch } from 'vue'
import EmptyState from '../../../../../shared/ui/EmptyState.vue'
import ActionChain from './ActionChain.vue'
import ConditionField from './ConditionField.vue'
import RulesEditor from './RulesEditor.vue'
import VariableField from './VariableField.vue'
import { useEnsureVariable } from '../model/useEnsureVariable'

const props = defineProps<{ node: UiNode }>()
const store = useUiTreeStore()

const isTable = computed(() => clickEventOf(props.node.type) === ClickEvent.Row)
interface BehaviorView {
  title: () => string
  description: string
  hint: string
}
const eventView = (event: EventName, description: string): BehaviorView => ({
  title: () => EVENT_LABELS[event],
  description,
  hint: `on ${event}`,
})
const behaviors: Record<BehaviorKind, BehaviorView> = {
  [BehaviorKind.Click]: {
    ...eventView(EventName.Click, 'Go to a page, change a variable, show a message'),
    title: () => (isTable.value ? 'When a row is clicked' : EVENT_LABELS[EventName.Click]),
  },
  [BehaviorKind.Change]: eventView(EventName.Change, 'Act when the person changes the value'),
  [BehaviorKind.Submit]: eventView(EventName.Submit, 'Act once every field passes its rules'),
  [BehaviorKind.Mounted]: eventView(EventName.Mounted, 'Act when the element shows up'),
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
  [BehaviorKind.Rules]: {
    title: () => 'Validate the value',
    description: 'Required, email, length and number limits',
    hint: 'rules',
  },
}
/** The events and rules this kind of element has; the other behaviors fit any element. */
const kinds = computed(() => {
  const events: string[] = eventsFor(props.node.type)
  return Object.values(BehaviorKind).filter(kind => {
    const event = EVENT_OF_KIND[kind]
    if (event) return events.includes(event)
    return kind !== BehaviorKind.Rules || hasValidation(props.node.type)
  })
})

const isSet = (kind: BehaviorKind) => {
  const event = EVENT_OF_KIND[kind]
  if (event) return actionsOf(props.node.events, event).length > 0
  return kind === BehaviorKind.Rules ? !!props.node.rules?.length : !!props.node[kind as keyof UiNode]
}
// A behavior that was just added stays visible even though it is still empty.
const added = ref<BehaviorKind[]>([])
watch(
  () => props.node.id,
  () => (added.value = []),
)
// An event set from outside (a template, an agent) stays visible even when the element would not offer it.
const active = computed(() => Object.values(BehaviorKind).filter(kind => isSet(kind) || added.value.includes(kind)))
const available = computed(() => kinds.value.filter(kind => !active.value.includes(kind)))

const setLogic = (patch: Parameters<typeof store.updateNodeLogic>[1]) => store.updateNodeLogic(props.node.id, patch)
const addBehavior = (kind: BehaviorKind) => {
  added.value = [...added.value, kind]
}
const removeBehavior = (kind: BehaviorKind) => {
  added.value = added.value.filter(item => item !== kind)
  const event = EVENT_OF_KIND[kind]
  if (event) setLogic({ events: withActions(props.node.events, event, []) })
  else if (kind === BehaviorKind.Rules) setLogic({ rules: [] })
  else setLogic({ [kind]: '' })
}

const ensureVariable = useEnsureVariable(store)
const setVariableLogic = (kind: BehaviorKind.Model | BehaviorKind.VFor, name: string) => {
  ensureVariable(name, kind === BehaviorKind.VFor ? [] : '')
  setLogic({ [kind]: name })
}
const valueHint = (kind: BehaviorKind) => {
  if (kind === BehaviorKind.Change) return '{{ value }} is the new value'
  return kind === BehaviorKind.Click && isTable.value ? '{{ item.id }} is the clicked row' : undefined
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

    <EmptyState
      v-if="!active.length"
      icon="mdi-lightning-bolt-outline"
      title="This element does nothing yet"
      description="Choose what it should do when you try the page in Preview."
    >
      <div class="behavior-starts">
        <button v-for="kind in available" :key="kind" type="button" class="behavior-start" @click="addBehavior(kind)">
          <span class="behavior-start__title">{{ behaviors[kind].title() }}</span>
          <span class="behavior-start__description text-medium-emphasis">{{ behaviors[kind].description }}</span>
        </button>
      </div>
    </EmptyState>

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

      <ActionChain
        v-if="EVENT_OF_KIND[kind]"
        :node="node"
        :event="EVENT_OF_KIND[kind]!"
        :value-hint="valueHint(kind)"
      />

      <ConditionField v-else-if="kind === BehaviorKind.VIf" :node="node" />

      <VariableField
        v-else-if="kind === BehaviorKind.Model"
        label="Variable"
        :model-value="node.model"
        @update:model-value="name => setVariableLogic(BehaviorKind.Model, name)"
      />

      <RulesEditor v-else-if="kind === BehaviorKind.Rules" :node="node" />

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
.behavior-starts {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.behavior-start {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 10px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 8px;
  text-align: left;
}
.behavior-start:hover {
  border-color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.06);
}
.behavior-start__title {
  font-size: 13px;
  font-weight: 600;
}
.behavior-start__description {
  font-size: 12px;
}
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
