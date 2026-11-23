<script setup lang="ts">
import {
  ColumnAlign,
  TableData,
  useUiTreeStore,
  cellSlotName as slotName,
  columnKeyError,
  tableColumns,
  tableRows,
  type UiNode,
} from '../../../entities/ui-node'
import { TableEditorTab } from '../model/tableEditorTab'
import { computed, ref, watch } from 'vue'
import { useCheckedDrafts } from '../../../../../shared/lib/useCheckedDrafts'

const props = defineProps<{ node: UiNode }>()
const store = useUiTreeStore()

const columns = computed(() => tableColumns(props.node))
const rows = computed(() => tableRows(props.node))
// A string value ({{orders}}) means the data comes from project state.
const boundRows = computed(() => (typeof props.node.props.items === 'string' ? props.node.props.items : ''))
const boundColumns = computed(() => (typeof props.node.props.headers === 'string' ? props.node.props.headers : ''))
const stateKeys = computed(() => Object.keys(store.project.state))
const tab = ref<TableEditorTab>(TableEditorTab.Columns)

const id = computed(() => props.node.id)

// A key is checked when the field is left, and a wrong one stays in the field with the reason beside it.
const keys = useCheckedDrafts(
  (key, value) => columnKeyError(columns.value, value, key),
  (key, value) => {
    if (value !== key) store.table.updateColumn(id.value, key, { key: value })
  },
)
watch(id, keys.reset)
const parseCell = (value: string) => (/^-?\d+(\.\d+)?$/.test(value) ? Number(value) : value)
const parseWidth = (value: string) => Number(value) || undefined
const patchCell = (rowIndex: number, key: string, value: string) =>
  store.table.updateRow(id.value, rowIndex, { [key]: parseCell(value) })

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
const bind = (prop: TableData, value: string | null) => {
  store.updateNodeProp(id.value, prop, value ? `{{${value.replace(/[{}\s]/g, '')}}}` : [])
  store.commit()
}
</script>

<template>
  <div class="table-editor mb-4">
    <VBtnToggle v-model="tab" mandatory density="compact" color="primary" variant="outlined" class="mb-3">
      <VBtn :value="TableEditorTab.Columns" size="small">Columns</VBtn>
      <VBtn :value="TableEditorTab.Rows" size="small">Rows</VBtn>
    </VBtnToggle>

    <template v-if="tab === TableEditorTab.Columns">
      <VCombobox
        :model-value="boundColumns.replace(/[{}]/g, '')"
        :items="stateKeys"
        label="Take columns from state (optional)"
        variant="outlined"
        density="compact"
        hide-details
        clearable
        class="mb-3"
        @update:model-value="value => bind(TableData.Headers, value)"
      />
      <template v-if="!boundColumns">
        <div v-for="column in columns" :key="column.key" class="table-editor__item">
          <div class="d-flex ga-2 mb-2">
            <VTextField
              :model-value="column.title"
              label="Title"
              variant="outlined"
              density="compact"
              hide-details
              @change="
                (e: Event) => store.table.updateColumn(id, column.key, { title: (e.target as HTMLInputElement).value })
              "
            />
            <VTextField
              :model-value="keys.shown(column.key, column.key)"
              :error-messages="keys.errorOf(column.key)"
              label="Key"
              variant="outlined"
              density="compact"
              hide-details="auto"
              @update:model-value="value => keys.edit(column.key, value)"
              @blur="keys.commit(column.key)"
              @keydown.enter="keys.commit(column.key)"
            />
            <VBtn
              icon="mdi-delete-outline"
              size="small"
              variant="text"
              color="error"
              :aria-label="`Delete column ${column.title}`"
              @click="store.table.removeColumn(id, column.key)"
            />
          </div>
          <div class="d-flex ga-3 align-center flex-wrap">
            <VSelect
              :model-value="column.align ?? ColumnAlign.Start"
              :items="Object.values(ColumnAlign)"
              label="Align"
              variant="outlined"
              density="compact"
              hide-details
              style="max-width: 110px"
              @update:model-value="value => store.table.updateColumn(id, column.key, { align: value })"
            />
            <VTextField
              :model-value="column.width"
              label="Width (px)"
              type="number"
              variant="outlined"
              density="compact"
              hide-details
              style="max-width: 110px"
              @change="
                (e: Event) =>
                  store.table.updateColumn(id, column.key, { width: parseWidth((e.target as HTMLInputElement).value) })
              "
            />
            <VSwitch
              :model-value="column.sortable !== false"
              label="Sortable"
              density="compact"
              color="primary"
              hide-details
              @update:model-value="value => store.table.updateColumn(id, column.key, { sortable: !!value })"
            />
            <VSwitch
              :model-value="!!column.chip"
              label="Status chip"
              density="compact"
              color="primary"
              hide-details
              @update:model-value="value => store.table.updateColumn(id, column.key, { chip: !!value })"
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
        <VBtn size="small" variant="tonal" prepend-icon="mdi-plus" @click="store.table.addColumn(id)">Add column</VBtn>
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
        @update:model-value="value => bind(TableData.Items, value)"
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
              @click="store.table.removeRow(id, rowIndex)"
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
          @click="store.table.addRow(id)"
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
  padding-top: 8px;
}
</style>
