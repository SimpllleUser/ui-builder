import { h, type VNode } from 'vue'
import { VChip } from 'vuetify/components'
import { cellSlotName } from '../model/componentDefinitions'

type CellSlot = (cell: { item: unknown; value: unknown; index: number }) => VNode[]

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
        ({ value }: { value: unknown }) => [
          h(VChip, { size: 'small', variant: 'tonal', color: statusColor(value) }, () => String(value ?? '')),
        ],
      ]),
  )
}
