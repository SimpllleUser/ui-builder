<script setup lang="ts">
import { computed } from 'vue'
import {
  ruleError,
  ruleLabel,
  ruleNeedsValue,
  RuleType,
  useUiTreeStore,
  type UiNode,
  type ValidationRule,
} from '../../../entities/ui-node'

/** The checks of a form field. Preview shows a broken rule under the field, and a form with one is not submitted. */
const props = defineProps<{ node: UiNode }>()
const store = useUiTreeStore()

const rules = computed(() => props.node.rules ?? [])
const unused = computed(() =>
  Object.values(RuleType)
    .filter(type => !rules.value.some(rule => rule.type === type))
    .map(type => ({ title: ruleLabel(type), value: type })),
)

const save = (next: ValidationRule[]) => store.updateNodeLogic(props.node.id, { rules: next })
const add = (type: RuleType) => save([...rules.value, { type }])
const remove = (index: number) => save(rules.value.filter((_, position) => position !== index))
const patch = (index: number, change: Partial<ValidationRule>) =>
  save(rules.value.map((rule, position) => (position === index ? { ...rule, ...change } : rule)))
</script>

<template>
  <div v-for="(rule, index) in rules" :key="rule.type" class="rule">
    <div class="rule__head">
      <span>{{ ruleLabel(rule.type) }}</span>
      <VBtn
        icon="mdi-close"
        size="x-small"
        variant="text"
        :aria-label="`Remove rule: ${ruleLabel(rule.type)}`"
        title="Remove rule"
        @click="remove(index)"
      />
    </div>
    <VTextField
      v-if="ruleNeedsValue(rule.type)"
      :model-value="rule.value ?? ''"
      label="Number"
      inputmode="numeric"
      :error-messages="ruleError(rule) ?? []"
      variant="outlined"
      density="compact"
      hide-details="auto"
      class="mb-2"
      @update:model-value="value => patch(index, { value: value ?? '' })"
    />
    <VTextField
      :model-value="rule.message ?? ''"
      label="Message (optional)"
      variant="outlined"
      density="compact"
      hide-details
      @update:model-value="value => patch(index, { message: value || undefined })"
    />
  </div>
  <VMenu v-if="unused.length" location="bottom start">
    <template #activator="{ props: menu }">
      <VBtn v-bind="menu" size="small" variant="tonal" prepend-icon="mdi-plus">Add rule</VBtn>
    </template>
    <VList density="compact">
      <VListItem v-for="item in unused" :key="item.value" :title="item.title" @click="add(item.value)" />
    </VList>
  </VMenu>
</template>

<style scoped>
.rule {
  margin-bottom: 10px;
}
.rule__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
}
</style>
