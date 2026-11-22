<script setup lang="ts">
import { computed } from 'vue'
import { useUiTreeStore } from '../../../entities/ui-node/model/store'
import type { UiAction, UiNode } from '../../../entities/ui-node/model/types'

const props = defineProps<{ node: UiNode }>()
const store = useUiTreeStore()

const stateKeys = computed(() => Object.keys(store.project.state))
const pageItems = computed(() => store.pages.map(page => ({ title: `${page.name} (${page.path})`, value: page.path })))
const action = computed<UiAction | undefined>(() => props.node.events?.click)
const actionType = computed(() => action.value?.type ?? 'none')
const actionTypes = [
  { title: 'Nothing', value: 'none' },
  { title: 'Go to page', value: 'navigate' },
  { title: 'Set state value', value: 'set' },
  { title: 'Toggle state (true/false)', value: 'toggle' },
]

const setLogic = (patch: Parameters<typeof store.updateNodeLogic>[1]) => store.updateNodeLogic(props.node.id, patch)
const setClick = (click: UiAction | undefined) => setLogic({ events: click ? { click } : undefined })
const changeType = (type: string) => {
  if (type === 'navigate') setClick({ type, to: store.pages[0]?.path ?? '/' })
  else if (type === 'set') setClick({ type, key: stateKeys.value[0] ?? '', value: 'true' })
  else if (type === 'toggle') setClick({ type, key: stateKeys.value[0] ?? '' })
  else setClick(undefined)
}
const patchAction = (patch: Partial<UiAction>) => {
  if (action.value) setClick({ ...action.value, ...patch } as UiAction)
}
</script>

<template>
  <section class="interactions" aria-label="Interactions">
    <div class="mt-6 mb-2 text-overline text-primary font-weight-bold">Interactions (preview)</div>
    <p class="text-caption text-medium-emphasis mb-3">
      Use state variables from <strong>Pages & state</strong>. Text and props can use <code v-pre>{{ name }}</code>.
    </p>

    <VCombobox
      :model-value="node.model"
      :items="stateKeys"
      label="v-model — bind to state"
      variant="outlined"
      density="compact"
      hide-details
      clearable
      class="mb-3"
      @update:model-value="value => setLogic({ model: value ?? '' })"
    />
    <VTextField
      :model-value="node.vIf"
      label="v-if — show only when"
      placeholder="isOpen, !loading, status == paid"
      variant="outlined"
      density="compact"
      hide-details
      clearable
      class="mb-3"
      @update:model-value="value => setLogic({ vIf: value ?? '' })"
    />
    <VCombobox
      :model-value="node.vFor"
      :items="stateKeys"
      label="v-for — repeat for each item of"
      hint="Inside use {{ item.title }} and {{ index }}"
      persistent-hint
      variant="outlined"
      density="compact"
      clearable
      class="mb-3"
      @update:model-value="value => setLogic({ vFor: value ?? '' })"
    />

    <VSelect
      :model-value="actionType"
      :items="actionTypes"
      :label="node.type === 'VDataTable' ? 'On row click (use {{ item.id }} in values)' : 'On click'"
      variant="outlined"
      density="compact"
      hide-details
      class="mb-3"
      @update:model-value="changeType"
    />
    <template v-if="action?.type === 'navigate'">
      <VCombobox
        :model-value="action.to"
        :items="pageItems"
        item-title="title"
        item-value="value"
        :return-object="false"
        label="Path"
        variant="outlined"
        density="compact"
        hide-details
        class="mb-3"
        @update:model-value="value => patchAction({ to: String(value ?? '') })"
      />
    </template>
    <template v-else-if="action">
      <VCombobox
        :model-value="action.key"
        :items="stateKeys"
        label="State name"
        variant="outlined"
        density="compact"
        hide-details
        class="mb-3"
        @update:model-value="value => patchAction({ key: String(value ?? '') })"
      />
      <VTextField
        v-if="action.type === 'set'"
        :model-value="action.value"
        label="Value (true, 3, text, JSON)"
        variant="outlined"
        density="compact"
        hide-details
        class="mb-3"
        @update:model-value="value => patchAction({ value: value ?? '' })"
      />
    </template>
  </section>
</template>
