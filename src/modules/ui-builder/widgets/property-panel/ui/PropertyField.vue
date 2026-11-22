<script setup lang="ts">
import { FieldKind, type PropField, useUiTreeStore, type UiNode } from '../../../entities/ui-node'
import FlexLayoutField from './fields/FlexLayoutField.vue'
import IconPickerField from './fields/IconPickerField.vue'
import JsonField from './fields/JsonField.vue'
import SpacingField from './fields/SpacingField.vue'
import TypographyField from './fields/TypographyField.vue'
import TableEditor from './TableEditor.vue'

/** One setting of the selected element, drawn with the control that fits its kind. */
const props = defineProps<{ node: UiNode; field: PropField }>()
const store = useUiTreeStore()

const textProp = (prop: string) => {
  const value = props.node.props[prop]
  return typeof value === 'string' ? value : null
}
const numberProp = (prop: string) => {
  const value = props.node.props[prop]
  return typeof value === 'number' ? value : 0
}
/** The setting's property name. Event handlers cannot rely on the narrowing of `field`, so they ask here. */
const propOf = (field: PropField) => ('prop' in field ? field.prop : '')
const flagProp = (prop: string) => props.node.props[prop] === true
const setProp = (prop: string, value: unknown) => store.updateNodeProp(props.node.id, prop, value)
const setName = (value: string) => store.updateNodeName(props.node.id, value)
</script>

<template>
  <VTextField
    v-if="field.kind === FieldKind.Text"
    :model-value="textProp(field.prop)"
    :label="field.label"
    :placeholder="field.placeholder"
    :clearable="field.clearable"
    variant="outlined"
    density="compact"
    class="mb-3"
    hide-details
    @update:model-value="value => setProp(propOf(field), value)"
  />

  <VTextarea
    v-else-if="field.kind === FieldKind.Textarea"
    :model-value="node.name"
    :label="field.label"
    variant="outlined"
    density="compact"
    auto-grow
    rows="2"
    hide-details
    @update:model-value="setName"
  />

  <VSelect
    v-else-if="field.kind === FieldKind.Select"
    :model-value="textProp(field.prop)"
    :label="field.label"
    :items="field.options"
    variant="outlined"
    density="compact"
    class="mb-3"
    hide-details
    @update:model-value="value => setProp(propOf(field), value)"
  />

  <VSwitch
    v-else-if="field.kind === FieldKind.Switch"
    :model-value="flagProp(field.prop)"
    :label="field.label"
    density="compact"
    color="primary"
    hide-details
    class="mb-1"
    @update:model-value="value => setProp(propOf(field), value)"
  />

  <template v-else-if="field.kind === FieldKind.Slider">
    <div class="text-caption mb-1">{{ field.label }}: {{ node.props[field.prop] ?? field.min }}</div>
    <VSlider
      :model-value="numberProp(field.prop)"
      :min="field.min"
      :max="field.max"
      :step="field.step ?? 1"
      :aria-label="field.label"
      thumb-label
      color="primary"
      class="mb-3"
      @update:model-value="value => setProp(propOf(field), value)"
    />
  </template>

  <div v-else-if="field.kind === FieldKind.Row" class="d-flex gap-2 mb-3">
    <VTextField
      v-for="item in field.fields"
      :key="item.prop"
      :model-value="textProp(item.prop)"
      :label="item.label"
      :placeholder="item.placeholder"
      variant="outlined"
      density="compact"
      hide-details
      @update:model-value="value => setProp(item.prop, value)"
    />
  </div>

  <JsonField v-else-if="field.kind === FieldKind.Json" :node="node" :prop="field.prop" :label="field.label" />
  <IconPickerField
    v-else-if="field.kind === FieldKind.IconPicker"
    :node="node"
    :prop="field.prop"
    :label="field.label"
    preview
  />
  <template v-else-if="field.kind === FieldKind.IconSlots">
    <IconPickerField v-for="slot in field.slots" :key="slot.prop" :node="node" :prop="slot.prop" :label="slot.label" />
  </template>
  <TableEditor v-else-if="field.kind === FieldKind.TableEditor" :node="node" />
  <FlexLayoutField v-else-if="field.kind === FieldKind.FlexLayout" :node="node" />
  <TypographyField v-else-if="field.kind === FieldKind.Typography" :node="node" />
  <SpacingField v-else-if="field.kind === FieldKind.Spacing" :node="node" :with-padding="field.withPadding" />
  <!-- Custom classes are edited under Advanced, not here. -->
</template>
