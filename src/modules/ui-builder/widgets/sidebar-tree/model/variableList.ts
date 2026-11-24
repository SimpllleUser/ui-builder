import { UsageKind, type VariableUsage } from '../../../entities/ui-node'

export enum VariableType {
  YesNo = 'yes-no',
  Number = 'number',
  Text = 'text',
  List = 'list',
  Object = 'object',
  Nothing = 'nothing',
}

export const VARIABLE_TYPE_VIEW: Record<VariableType, { label: string; icon: string }> = {
  [VariableType.YesNo]: { label: 'Yes / no', icon: 'mdi-toggle-switch-outline' },
  [VariableType.Number]: { label: 'Number', icon: 'mdi-numeric' },
  [VariableType.Text]: { label: 'Text', icon: 'mdi-format-text' },
  [VariableType.List]: { label: 'List', icon: 'mdi-format-list-bulleted' },
  [VariableType.Object]: { label: 'Record', icon: 'mdi-code-braces' },
  [VariableType.Nothing]: { label: 'Empty', icon: 'mdi-circle-off-outline' },
}

/** What a usage means for a person reading the list. */
export const USAGE_LABELS: Record<UsageKind, string> = {
  [UsageKind.Text]: 'shown in text',
  [UsageKind.Property]: 'used in a property',
  [UsageKind.Link]: 'linked to an input',
  [UsageKind.Repeat]: 'repeated over',
  [UsageKind.Condition]: 'used in a condition',
  [UsageKind.Click]: 'used by a click',
}

export function variableTypeOf(value: unknown): VariableType {
  if (value === null || value === undefined) return VariableType.Nothing
  if (typeof value === 'boolean') return VariableType.YesNo
  if (typeof value === 'number') return VariableType.Number
  if (typeof value === 'string') return VariableType.Text
  return Array.isArray(value) ? VariableType.List : VariableType.Object
}

/** The starting value as it is typed in the field: text as it is, anything else as JSON. */
export const formatVariableValue = (value: unknown) => (typeof value === 'string' ? value : JSON.stringify(value))

export interface VariableRow {
  name: string
  value: unknown
  type: VariableType
  usages: VariableUsage[]
  /** How many different elements use it (one element can use it several ways). */
  elementCount: number
}

export function buildVariableRows(state: Record<string, unknown>, usages: VariableUsage[]): VariableRow[] {
  return Object.entries(state).map(([name, value]) => {
    const own = usages.filter(usage => usage.name === name)
    return {
      name,
      value,
      type: variableTypeOf(value),
      usages: own,
      elementCount: new Set(own.map(usage => usage.nodeId)).size,
    }
  })
}

export const countLabel = (count: number) =>
  count === 0 ? 'Not used' : `Used in ${count} ${count === 1 ? 'element' : 'elements'}`
