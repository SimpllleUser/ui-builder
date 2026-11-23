import type { FieldKind } from './enums'
import { COMPONENT_DEFS, type PropField } from './componentDefinitions'

export interface DescribedField {
  prop: string
  kind: FieldKind
  label: string
  options?: string[]
  min?: number
  max?: number
}

/** The settings of a component with a name: prop, kind and allowed values. Used by MCP and the command palette. */
export function describeFields(type: string): DescribedField[] {
  const fields: DescribedField[] = []
  for (const section of COMPONENT_DEFS[type]?.propertySections ?? []) {
    for (const field of section.fields as PropField[]) {
      if ('prop' in field) {
        fields.push({
          prop: field.prop,
          kind: field.kind,
          label: field.label,
          ...('options' in field ? { options: field.options } : {}),
          ...('min' in field ? { min: field.min, max: field.max } : {}),
        })
      }
    }
  }
  return fields
}
