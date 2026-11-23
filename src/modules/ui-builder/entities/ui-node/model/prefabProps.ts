import type { PrefabProp, UiNode } from './types'

/**
 * A saved component reads its parameters as `{{props.title}}` anywhere in an element including
 * text (the name of a text element), properties, classes, conditions (`vIf`, `vFor`), the linked variable and click actions.
 * They are filled in when the component is inserted, so the `props.` prefix keeps them apart from
 * the project variables (`{{title}}`) that stay live in preview.
 */
const PROP_PLACEHOLDER = /\{\{\s*props\.([A-Za-z_]\w*)\s*\}\}/g

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

function childNodes(node: UiNode): UiNode[] {
  return [...node.children, ...Object.values(node.slots).flat()]
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

/** Parameters to offer for an element: every name used in it, with the given default or an empty one. */
export function declarePrefabProps(node: UiNode, defaults: PrefabPropValues = {}): PrefabProp[] {
  return findPrefabPropNames(node).map(name => ({ name, defaultValue: defaults[name] ?? '' }))
}

/** Copy of the element with its placeholders replaced by the given values, or the defaults for missing ones. */
export function applyPrefabProps(node: UiNode, props: PrefabProp[], values: PrefabPropValues = {}): UiNode {
  const resolved = new Map(props.map(prop => [prop.name, values[prop.name] ?? prop.defaultValue]))
  const fill = (text: string) =>
    text.replace(PROP_PLACEHOLDER, (placeholder, name: string) => resolved.get(name) ?? placeholder)
  const apply = (current: UiNode): UiNode => ({
    ...mapStrings(ownContent(current), fill),
    children: current.children.map(apply),
    slots: Object.fromEntries(Object.entries(current.slots).map(([slot, nodes]) => [slot, nodes.map(apply)])),
  })
  return apply(node)
}

/** The parameters of an edited component: the names it uses now, keeping the defaults already chosen. */
export function reconcilePrefabProps(node: UiNode, current: PrefabProp[] = []): PrefabProp[] {
  return declarePrefabProps(node, Object.fromEntries(current.map(prop => [prop.name, prop.defaultValue])))
}
