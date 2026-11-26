import { typedPrefabValue } from './prefabParameters'
import { childNodes } from './treeUtils'
import type { PrefabProp, UiNode } from './types'

/**
 * A saved component reads its parameters as `{{props.title}}` anywhere in an element including
 * text (the name of a text element), properties, classes, conditions (`vIf`, `vFor`), the linked variable and click actions.
 * They are filled in for each instance (see componentInstances.ts), so the `props.` prefix keeps them apart from
 * the project variables (`{{title}}`) that stay live in preview.
 */
const PROP_PLACEHOLDER = /\{\{\s*props\.([A-Za-z_]\w*)\s*\}\}/g

const QUOTED_PROP_PLACEHOLDER = /(["'])\{\{\s*props\.([A-Za-z_]\w*)\s*\}\}\1/g

export type PrefabPropValues = Record<string, string>

function forEachString(value: unknown, visit: (text: string) => void): void {
  if (typeof value === 'string') visit(value)
  else if (Array.isArray(value)) value.forEach(item => forEachString(item, visit))
  else if (value !== null && typeof value === 'object') Object.values(value).forEach(item => forEachString(item, visit))
}

/** Same shape with every string passed through `transform`; the shape is unchanged, so the type is kept. */
function mapStrings<T>(value: T, transform: (text: string) => string): T {
  if (typeof value === 'string') return transform(value) as T
  if (Array.isArray(value)) return value.map(item => mapStrings(item, transform)) as T
  if (value !== null && typeof value === 'object')
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, mapStrings(item, transform)])) as T
  return value
}

/** What an element holds itself, without its children. */
function ownContent({ children: _children, slots: _slots, ...own }: UiNode) {
  return own
}

/** Names of the parameters used inside an element and its children, in order of first use. */
export function findPrefabPropNames(node: UiNode): string[] {
  const names = new Set<string>()
  const collect = (current: UiNode) => {
    const remember = (text: string) => {
      for (const match of text.matchAll(PROP_PLACEHOLDER)) names.add(match[1])
    }
    forEachString(ownContent(current), remember)
    childNodes(current).forEach(collect)
  }
  collect(node)
  return [...names]
}

/**
 * The parameters of an element: every name used in it, with its known definition or as plain text, followed by the
 * ones created by hand that nothing uses yet.
 */
export function declarePrefabProps(node: UiNode, definitions: PrefabProp[] = []): PrefabProp[] {
  const used = findPrefabPropNames(node)
  const known = new Map(definitions.map(prop => [prop.name, prop]))
  return [
    ...used.map(name => known.get(name) ?? { name, defaultValue: '' }),
    ...definitions.filter(prop => prop.isDeclared && !used.includes(prop.name)),
  ]
}

const WHOLE_PLACEHOLDER = /^\{\{\s*props\.([A-Za-z_]\w*)\s*\}\}$/
/** Properties that are text whatever the parameter's type is. */
const TEXT_PROPERTIES = new Set(['class', 'style'])

/** Copy of the element with its placeholders replaced by the given values, or the defaults for missing ones. */
export function applyPrefabProps(node: UiNode, props: PrefabProp[], values: PrefabPropValues = {}): UiNode {
  const resolved = new Map(props.map(prop => [prop.name, values[prop.name] ?? prop.defaultValue]))
  const fill = (text: string) =>
    text.replace(PROP_PLACEHOLDER, (placeholder, name: string) => resolved.get(name) ?? placeholder)
  // In a condition the value must stay one word or number, so a value with spaces or symbols cannot change its meaning.
  const fillCondition = (condition: string) =>
    condition
      .replace(QUOTED_PROP_PLACEHOLDER, (placeholder, quote: string, name: string) =>
        resolved.has(name)
          ? `${quote}${(resolved.get(name) ?? '').replaceAll(quote, `\\${quote}`)}${quote}`
          : placeholder,
      )
      .replace(PROP_PLACEHOLDER, (placeholder, name: string) => {
        const value = resolved.get(name)
        if (value === undefined) return placeholder
        return value.trim() !== '' && Number.isFinite(Number(value)) ? value.trim() : JSON.stringify(value)
      })
  const definitions = new Map(props.map(prop => [prop.name, prop]))
  /** A property that is one placeholder and nothing else gets the value in the parameter's type. */
  const fillProperty = (text: string): unknown => {
    const definition = definitions.get(WHOLE_PLACEHOLDER.exec(text)?.[1] ?? '')
    return definition ? typedPrefabValue(definition, resolved.get(definition.name) ?? '') : fill(text)
  }
  const fillProperties = (properties: Record<string, unknown>) =>
    Object.fromEntries(
      Object.entries(properties).map(([key, value]) => [
        key,
        typeof value === 'string' && !TEXT_PROPERTIES.has(key) ? fillProperty(value) : mapStrings(value, fill),
      ]),
    )
  const apply = (current: UiNode): UiNode => ({
    ...mapStrings(ownContent(current), fill),
    props: fillProperties(current.props),
    ...(current.vIf ? { vIf: fillCondition(current.vIf) } : {}),
    children: current.children.map(apply),
    slots: Object.fromEntries(Object.entries(current.slots).map(([slot, nodes]) => [slot, nodes.map(apply)])),
  })
  return apply(node)
}
