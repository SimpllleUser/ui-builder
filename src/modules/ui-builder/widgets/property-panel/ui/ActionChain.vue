<script setup lang="ts">
import { computed } from 'vue'
import {
  actionsOf,
  createAction,
  ActionType,
  MAX_ACTIONS_PER_EVENT,
  useUiTreeStore,
  withActions,
  type EventName,
  type UiAction,
  type UiNode,
} from '../../../entities/ui-node'
import ActionFields from './ActionFields.vue'

/** The actions of one event, run from the top down. */
const props = defineProps<{ node: UiNode; event: EventName; valueHint?: string }>()
const store = useUiTreeStore()

const actions = computed(() => actionsOf(props.node.events, props.event))
// An event with nothing yet still shows one empty step to choose from.
const steps = computed<Array<UiAction | undefined>>(() => (actions.value.length ? actions.value : [undefined]))

const save = (next: UiAction[]) =>
  store.updateNodeLogic(props.node.id, { events: withActions(props.node.events, props.event, next) })
const change = (index: number, action: UiAction | undefined) => {
  const next = [...actions.value]
  if (action) next[index] = action
  else next.splice(index, 1)
  save(next)
}
const add = () => save([...actions.value, createAction(ActionType.Notify, { path: '/', variable: '' })])
const moveUp = (index: number) => {
  const next = [...actions.value]
  next.splice(index - 1, 0, ...next.splice(index, 1))
  save(next)
}
</script>

<template>
  <div v-for="(action, index) in steps" :key="index" class="action-step">
    <div v-if="steps.length > 1" class="action-step__head">
      <span>Step {{ index + 1 }}</span>
      <VBtn
        icon="mdi-arrow-up"
        size="x-small"
        variant="text"
        :disabled="index === 0"
        :aria-label="`Move step ${index + 1} up`"
        title="Run earlier"
        @click="moveUp(index)"
      />
      <VBtn
        icon="mdi-delete-outline"
        size="x-small"
        variant="text"
        :aria-label="`Remove step ${index + 1}`"
        title="Remove step"
        @click="change(index, undefined)"
      />
    </div>
    <ActionFields :action="action" :value-hint="valueHint" @change="next => change(index, next)" />
  </div>
  <VBtn
    v-if="actions.length && actions.length < MAX_ACTIONS_PER_EVENT"
    size="x-small"
    variant="text"
    prepend-icon="mdi-plus"
    class="mt-2"
    @click="add"
  >
    Then also…
  </VBtn>
</template>

<style scoped>
.action-step + .action-step {
  margin-top: 12px;
  padding-top: 8px;
  border-top: 1px dashed rgba(var(--v-border-color), 0.3);
}
.action-step__head {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 4px;
  font-size: 12px;
  font-weight: 600;
}
.action-step__head span {
  flex: 1;
}
</style>
