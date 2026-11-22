<script setup lang="ts">
import { computed, ref } from 'vue'
import { useUiTreeStore } from '../../../entities/ui-node/model/store'
import { cellSlotName as slotName } from '../../../entities/ui-node/model/componentDefinitions'
import type { UiNode } from '../../../entities/ui-node/model/types'

interface Column {
  title: string
  key: string
  align?: string
  sortable?: boolean
  chip?: boolean
}
type Row = Record<string, unknown>

const props = defineProps<{ node: UiNode }>()
const store = useUiTreeStore()

const columns = computed<Column[]>(() =>
  Array.isArray(props.node.props.headers) ? (props.node.props.headers as Column[]) : [],
)
const rows = computed<Row[]>(() => (Array.isArray(props.node.props.items) ? (props.node.props.items as Row[]) : []))
// A string value ({{orders}}) means the data comes from project state.
const boundRows = computed(() => (typeof props.node.props.items === 'string' ? props.node.props.items : ''))
const boundColumns = computed(() => (typeof props.node.props.headers === 'string' ? props.node.props.headers : ''))
const stateKeys = computed(() => Object.keys(store.project.state))
const tab = ref<'columns' | 'rows'>('columns')

const set = (prop: 'headers' | 'items', value: unknown) => {
  store.updateNodeProp(props.node.id, prop, value)
  store.commit()
}
const patchColumn = (index: number, patch: Partial<Column>) => {
  const oldKey = columns.value[index].key
  set(
    'headers',
    columns.value.map((column, i) => (i === index ? { ...column, ...patch } : column)),
  )
  // Keep the column's cell content when its key changes; drop it if the new key is taken or empty.
  const newKey = patch.key
  if (newKey !== undefined && newKey !== oldKey && props.node.slots[slotName(oldKey)]) {
    const cell = props.node.slots[slotName(oldKey)]
    delete props.node.slots[slotName(oldKey)]
    if (newKey && !columns.value.some((column, i) => i !== index && column.key === newKey))
      props.node.slots[slotName(newKey)] = cell
    store.commit()
  }
}
const addColumn = () => {
  let n = columns.value.length + 1
  while (columns.value.some(column => column.key === `col${n}`)) n++
  set('headers', [...columns.value, { title: `Column ${n}`, key: `col${n}` }])
}
const removeColumn = (index: number) => {
  const key = columns.value[index].key
  delete props.node.slots[slotName(key)]
  set(
    'headers',
    columns.value.filter((_, i) => i !== index),
  )
  set(
    'items',
    rows.value.map(({ [key]: _removed, ...row }) => row),
  )
}
const patchCell = (rowIndex: number, key: string, value: string) =>
  set(
    'items',
    rows.value.map((row, i) =>
      i === rowIndex ? { ...row, [key]: /^-?\d+(\.\d+)?$/.test(value) ? Number(value) : value } : row,
    ),
  )
const addRow = () => set('items', [...rows.value, Object.fromEntries(columns.value.map(column => [column.key, '']))])
const removeRow = (index: number) =>
  set(
    'items',
    rows.value.filter((_, i) => i !== index),
  )
const CELL_COMPONENTS = [
  { title: 'Button', value: 'VBtn' },
  { title: 'Icon', value: 'VIcon' },
  { title: 'Chip', value: 'VChip' },
  { title: 'Avatar', value: 'VAvatar' },
  { title: 'Image', value: 'VImg' },
  { title: 'Switch', value: 'VSwitch' },
  { title: 'Checkbox', value: 'VCheckbox' },
  { title: 'Progress bar', value: 'VProgressLinear' },
  { title: 'Box (div)', value: 'div' },
]
const cellCount = (key: string) => props.node.slots[slotName(key)]?.length ?? 0
const addToCell = (key: string, type: string | null) => {
  if (type) store.appendToSlot(props.node.id, slotName(key), store.createNode(type))
}
const clearCell = (key: string) => {
  store.commit()
  delete props.node.slots[slotName(key)]
  store.commit()
}
const bind = (prop: 'headers' | 'items', value: string | null) => {
  set(prop, value ? `{{${value.replace(/[{}\s]/g, '')}}}` : [])
}
</script>

<template>
  <div class="table-editor mb-4">
    <VBtnToggle v-model="tab" mandatory density="compact" color="primary" variant="outlined" class="mb-3">
      <VBtn value="columns" size="small">Columns</VBtn>
      <VBtn value="rows" size="small">Rows</VBtn>
    </VBtnToggle>

    <template v-if="tab === 'columns'">
      <VCombobox
        :model-value="boundColumns.replace(/[{}]/g, '')"
        :items="stateKeys"
        label="Take columns from state (optional)"
        variant="outlined"
        density="compact"
        hide-details
        clearable
        class="mb-3"
        @update:model-value="value => bind('headers', value)"
      />
      <template v-if="!boundColumns">
        <div v-for="(column, index) in columns" :key="index" class="table-editor__item">
          <div class="d-flex ga-2 mb-2">
            <VTextField
              :model-value="column.title"
              label="Title"
              variant="outlined"
              density="compact"
              hide-details
              @update:model-value="value => patchColumn(index, { title: value })"
            />
            <VTextField
              :model-value="column.key"
              label="Key"
              variant="outlined"
              density="compact"
              hide-details
              @update:model-value="value => patchColumn(index, { key: value })"
            />
            <VBtn
              icon="mdi-delete-outline"
              size="small"
              variant="text"
              color="error"
              :aria-label="`Delete column ${column.title}`"
              @click="removeColumn(index)"
            />
          </div>
          <div class="d-flex ga-3 align-center flex-wrap">
            <VSelect
              :model-value="column.align ?? 'start'"
              :items="['start', 'center', 'end']"
              label="Align"
              variant="outlined"
              density="compact"
              hide-details
              style="max-width: 110px"
              @update:model-value="value => patchColumn(index, { align: value })"
            />
            <VSwitch
              :model-value="column.sortable !== false"
              label="Sortable"
              density="compact"
              color="primary"
              hide-details
              @update:model-value="value => patchColumn(index, { sortable: !!value })"
            />
            <VSwitch
              :model-value="!!column.chip"
              label="Status chip"
              density="compact"
              color="primary"
              hide-details
              @update:model-value="value => patchColumn(index, { chip: !!value })"
            />
          </div>
          <div class="d-flex ga-2 align-center mt-2">
            <VSelect
              :model-value="null"
              :items="CELL_COMPONENTS"
              :label="
                cellCount(column.key)
                  ? `Cell content (${cellCount(column.key)}) — add more`
                  : 'Cell content — add component'
              "
              variant="outlined"
              density="compact"
              hide-details
              @update:model-value="value => addToCell(column.key, value)"
            />
            <VBtn
              v-if="cellCount(column.key)"
              size="small"
              variant="text"
              :aria-label="`Clear cell content of ${column.title}`"
              @click="clearCell(column.key)"
              >Clear</VBtn
            >
          </div>
        </div>
        <p class="text-caption text-medium-emphasis mb-2">
          Cell components can use <code v-pre>{{ value }}</code> (this cell) and <code v-pre>{{ item.key }}</code> (the
          row), also in click actions. Edit them in Layers under the table.
        </p>
        <VBtn size="small" variant="tonal" prepend-icon="mdi-plus" @click="addColumn">Add column</VBtn>
      </template>
    </template>

    <template v-else>
      <VCombobox
        :model-value="boundRows.replace(/[{}]/g, '')"
        :items="stateKeys"
        label="Take rows from state (optional)"
        variant="outlined"
        density="compact"
        hide-details
        clearable
        class="mb-3"
        @update:model-value="value => bind('items', value)"
      />
      <template v-if="!boundRows && !boundColumns">
        <div class="table-editor__grid">
          <div v-for="(row, rowIndex) in rows" :key="rowIndex" class="d-flex ga-1 mb-1">
            <VTextField
              v-for="column in columns"
              :key="column.key"
              :model-value="row[column.key] as string"
              :label="column.title"
              variant="outlined"
              density="compact"
              hide-details
              style="min-width: 90px"
              @update:model-value="value => patchCell(rowIndex, column.key, value ?? '')"
            />
            <VBtn
              icon="mdi-delete-outline"
              size="x-small"
              variant="text"
              color="error"
              :aria-label="`Delete row ${rowIndex + 1}`"
              @click="removeRow(rowIndex)"
            />
          </div>
        </div>
        <p v-if="!columns.length" class="text-caption text-medium-emphasis">Add columns first.</p>
        <VBtn
          size="small"
          variant="tonal"
          prepend-icon="mdi-plus"
          :disabled="!columns.length"
          class="mt-2"
          @click="addRow"
          >Add row</VBtn
        >
      </template>
      <p v-else-if="boundColumns && !boundRows" class="text-caption text-medium-emphasis">
        Columns come from state; edit rows by binding them or switch columns back to manual.
      </p>
    </template>
  </div>
</template>

<style scoped>
.table-editor__item {
  padding: 8px;
  margin-bottom: 8px;
  border: 1px solid rgba(var(--v-border-color), 0.2);
  border-radius: 8px;
}
.table-editor__grid {
  overflow-x: auto;
}
</style>
