/** The types of saved-component parameters: which values and definitions are valid. */
import { PrefabPropType } from './enums'
import type { PrefabProp } from './types'

export enum BooleanText {
  True = 'true',
  False = 'false',
}

export const PREFAB_PROP_TYPE_LABELS: Record<PrefabPropType, string> = {
  [PrefabPropType.Text]: 'Text',
  [PrefabPropType.Number]: 'Number',
  [PrefabPropType.Boolean]: 'Boolean',
  [PrefabPropType.Choice]: 'Choice',
  [PrefabPropType.Color]: 'Color',
  [PrefabPropType.Link]: 'Link',
}

const PARAMETER_NAME = /^[A-Za-z_]\w*$/
/** Vue keeps these for itself, so a component could not receive them. */
const VUE_ATTRIBUTES = new Set(['key', 'ref', 'class', 'style'])
/** A hex or functional colour, or a name such as `primary` or `red-darken-2`. */
const COLOR = /^(#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})|(rgb|hsl)a?\([\d\s.,%/]+\)|[a-z][a-z0-9-]*)$/i
const LINK = /^(\/|#|https?:\/\/|mailto:|tel:)\S*$/i

export const prefabPropType = (prop: PrefabProp): PrefabPropType => prop.type ?? PrefabPropType.Text

const isNumber = (value: string) => value.trim() !== '' && Number.isFinite(Number(value))

type ValueCheck = (value: string, prop: PrefabProp) => string | null

const CHECKS: Record<PrefabPropType, ValueCheck> = {
  [PrefabPropType.Text]: (value, { maxLength }) =>
    maxLength !== undefined && value.length > maxLength ? `Use at most ${maxLength} characters.` : null,
  [PrefabPropType.Number]: (value, { min, max }) => {
    if (!isNumber(value)) return 'Enter a number.'
    if (min !== undefined && Number(value) < min) return `Use ${min} or more.`
    return max !== undefined && Number(value) > max ? `Use ${max} or less.` : null
  },
  [PrefabPropType.Boolean]: value => (Object.values<string>(BooleanText).includes(value) ? null : 'Use true or false.'),
  [PrefabPropType.Choice]: (value, { options = [] }) =>
    options.includes(value) ? null : `Choose one of: ${options.join(', ')}.`,
  [PrefabPropType.Color]: value => (COLOR.test(value) ? null : 'Use a colour such as #1976d2 or primary.'),
  [PrefabPropType.Link]: value => (LINK.test(value) ? null : 'Start with /, #, https://, mailto: or tel:.'),
}

/** Why the value does not fit the parameter, or null. An empty value is fine unless the parameter is required. */
export function prefabValueError(prop: PrefabProp, value: string): string | null {
  if (value === '') return prop.required ? 'This parameter is required.' : null
  return CHECKS[prefabPropType(prop)](value, prop)
}

/** The first invalid value among those given, with the parameter's name, or null. */
export function prefabValuesError(props: PrefabProp[], values: Record<string, string>): string | null {
  for (const prop of props) {
    if (!(prop.name in values)) continue
    const error = prefabValueError(prop, values[prop.name])
    if (error) return `${prop.name}: ${error}`
  }
  return null
}

export function prefabPropNameError(name: string, taken: string[]): string | null {
  if (!name) return 'Enter a key.'
  if (!PARAMETER_NAME.test(name)) return 'Use letters, digits and _, and do not start with a digit.'
  if (VUE_ATTRIBUTES.has(name)) return 'Vue reserves this name. Choose another.'
  return taken.includes(name) ? 'A parameter with this key already exists.' : null
}

/** Which field of a definition is wrong, and why. */
export interface PrefabPropErrors {
  limits?: string
  options?: string
  defaultValue?: string
}

export function prefabPropErrors(prop: PrefabProp): PrefabPropErrors {
  const type = prefabPropType(prop)
  if (type === PrefabPropType.Number && prop.min !== undefined && prop.max !== undefined && prop.min > prop.max)
    return { limits: 'Min is greater than Max.' }
  if (type === PrefabPropType.Text && prop.maxLength !== undefined && prop.maxLength < 1)
    return { limits: 'Use 1 or more.' }
  if (type === PrefabPropType.Choice && !prop.options?.length) return { options: 'Add at least one option.' }
  // A required parameter may still wait for its value, so an empty default is no mistake here.
  const error = prop.defaultValue === '' ? null : prefabValueError(prop, prop.defaultValue)
  return error ? { defaultValue: error } : {}
}

/** A number or a boolean as such, so the element receives the type it expects; anything else stays text. */
export function typedPrefabValue(prop: PrefabProp, value: string): string | number | boolean {
  // Vue reads an empty text on a boolean property as true, so a boolean left empty is false.
  if (value === '' && prefabPropType(prop) === PrefabPropType.Boolean) return false
  if (value === '' || prefabValueError(prop, value)) return value
  if (prefabPropType(prop) === PrefabPropType.Number) return Number(value)
  if (prefabPropType(prop) === PrefabPropType.Boolean) return value === BooleanText.True
  return value
}
