import { TableData } from './enums'
import { interpolate, type Scope } from './runtime'

/**
 * A table's columns and rows may be `{{variable}}` bindings. Vuetify needs real lists, so a binding is replaced by the
 * variable's value, or by an empty list when the variable has no list (yet).
 */
export function resolveTableData(props: Record<string, unknown>, scope: Scope): Record<string, unknown> {
  const resolved: Record<string, unknown> = {}
  for (const key of Object.values(TableData)) {
    const value = props[key]
    if (typeof value !== 'string') continue
    const bound = interpolate(value, scope)
    resolved[key] = Array.isArray(bound) ? bound : []
  }
  return resolved
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
