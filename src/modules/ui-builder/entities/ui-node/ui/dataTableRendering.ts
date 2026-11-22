import { h, type VNode } from 'vue'
import { VChip } from 'vuetify/components'
import { cellSlotName } from '../model/componentDefinitions'

type CellSlot = (cell: { item: unknown; value: unknown; index: number }) => VNode | VNode[]

const STATUS_COLORS: Record<string, string> = {
  paid: 'success',
  done: 'success',
  completed: 'success',
  delivered: 'success',
  active: 'success',
  pending: 'warning',
  processing: 'warning',
  new: 'info',
  shipped: 'info',
  cancelled: 'error',
  canceled: 'error',
  failed: 'error',
  refunded: 'error',
  blocked: 'error',
}
const statusColor = (value: unknown) => STATUS_COLORS[String(value ?? '').toLowerCase()] ?? 'default'

/** Slots that show columns marked "Status chip" as colored chips. */
export function statusChipSlots(headers: unknown): Record<string, CellSlot> {
  if (!Array.isArray(headers)) return {}
  return Object.fromEntries(
    headers
      .filter((header): header is { key: string; chip: true } => !!header?.chip && typeof header.key === 'string')
      .map(header => [
        cellSlotName(header.key),
        ({ value }: { value: unknown }) =>
          h(VChip, { size: 'small', variant: 'tonal', color: statusColor(value) }, () => String(value ?? '')),
      ]),
  )
}

/** Table looks that Vuetify has no prop for are CSS classes (see shared/tableStyles.css). */
export function tableStyleClasses({ striped, bordered, headerColor }: Record<string, unknown>): string[] {
  return [
    striped ? 'ui-table--striped' : '',
    bordered ? 'ui-table--bordered' : '',
    typeof headerColor === 'string' && headerColor ? `ui-table-header--${headerColor}` : '',
  ].filter(Boolean)
}

/** The inspector stores height as text; Vuetify wants a number for pixel heights. */
export const tableHeight = (height: unknown) =>
  typeof height === 'string' && height.trim() ? Number(height) || height : height
