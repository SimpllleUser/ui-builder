/** Inline style of an element, as `property → value`. The design controls and the MCP style tools keep their settings here. */
export type StyleMap = Record<string, string>

const IMPORTANT = '!important'

/** Reads the style of an element, which may be an object or CSS text such as `color: red; margin: 0`. */
export function readStyle(value: unknown): StyleMap {
  if (typeof value === 'string') {
    return Object.fromEntries(
      value
        .split(';')
        .map(part => part.split(/:(.*)/s))
        .filter(([name, rest]) => name?.trim() && rest?.trim())
        .map(([name, rest]) => [camelCase(name.trim()), rest.trim()]),
    )
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).filter(([, item]) => typeof item === 'string')) as StyleMap
  }
  return {}
}

const camelCase = (name: string) => name.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase())

/** The style with `patch` applied. A value of `null` or an empty text removes that property. */
export function withStyle(current: StyleMap, patch: Record<string, string | null>): StyleMap {
  const next = { ...current }
  for (const [name, value] of Object.entries(patch)) {
    if (value === null || value === '') delete next[name]
    else next[name] = value
  }
  return next
}

/**
 * Vuetify's utility classes (`pa-4`, `rounded-lg`, `d-flex`…) are `!important`, so a value from the design controls
 * must be as well, or the class would win. The controls read values without the marker.
 */
export const markImportant = (value: string) => (value.endsWith(IMPORTANT) ? value : `${value} ${IMPORTANT}`)
export const stripImportant = (value: string) => value.replace(/\s*!important\s*$/, '')
export const cleanStyle = (style: StyleMap): StyleMap =>
  Object.fromEntries(Object.entries(style).map(([name, value]) => [name, stripImportant(value)]))

export const toPx = (value: number | null) => (value === null ? null : `${value}px`)

/** `12px` and `12` read as 12; anything else (`50%`, `auto`) is not a plain pixel value. */
export function parsePx(value: string | undefined): number | null {
  if (!value) return null
  const match = /^(-?\d+(?:\.\d+)?)(?:px)?$/.exec(value.trim())
  return match ? Number(match[1]) : null
}

/** CSS properties whose number means pixels (`12` → `12px`). Other numbers (opacity, z-index, line-height…) stay as they are. */
const LENGTH_PROPERTIES =
  /^(width|height|(min|max)(Width|Height)|gap|(row|column)Gap|fontSize|top|left|right|bottom|margin.*|padding.*|border.*(Width|Radius))$/
const UNSAFE_VALUE = /[;{}]|\/\*/

export interface StyleInput {
  [property: string]: string | number | null
}

/**
 * Turns a loose style description into a patch for `withStyle`: names may be kebab-case, lengths may be numbers,
 * colours may be theme colour names, and every value is marked `!important` so it wins over utility classes.
 * Throws a readable message for a name or value that is not plain CSS.
 */
export function normalizeStyleInput(
  input: StyleInput,
  themeColor: (value: string) => string | null,
): Record<string, string | null> {
  const patch: Record<string, string | null> = {}
  for (const [rawName, rawValue] of Object.entries(input)) {
    const name = camelCase(rawName.trim())
    if (!/^[a-zA-Z]+$/.test(name)) throw new Error(`“${rawName}” is not a CSS property name.`)
    if (rawValue === null || rawValue === '') {
      patch[name] = null
      continue
    }
    let value =
      typeof rawValue === 'number'
        ? LENGTH_PROPERTIES.test(name)
          ? `${rawValue}px`
          : String(rawValue)
        : rawValue.trim()
    if (UNSAFE_VALUE.test(value)) throw new Error(`The value for ${name} contains characters that are not allowed.`)
    value = themeColor(value) ?? value
    patch[name] = markImportant(value)
  }
  return patch
}
