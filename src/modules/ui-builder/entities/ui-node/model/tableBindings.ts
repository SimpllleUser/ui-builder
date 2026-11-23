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
