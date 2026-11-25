import { h, type VNode } from 'vue'
import { VChip } from 'vuetify/components'
import { behaviorOf } from '../model/componentBehaviors'
import { cellSlotName } from '../model/componentDefinitions'
import { chipColumnKeys, STATUS_CHIP_PROPS, statusColor } from '../model/statusChips'

type CellSlot = (cell: { item: unknown; value: unknown; index: number }) => VNode[]

const statusChipCell: CellSlot = ({ value }) => [
  h(VChip, { ...STATUS_CHIP_PROPS, color: statusColor(value) }, () => String(value ?? '')),
]

/** Slots a component gets from its settings. Content the person put into the same slot wins over them. */
export const generatedSlots = (type: string, props: Record<string, unknown>): Record<string, CellSlot> =>
  behaviorOf(type).hasStatusChips
    ? Object.fromEntries(chipColumnKeys(props.headers).map(key => [cellSlotName(key), statusChipCell]))
    : {}
