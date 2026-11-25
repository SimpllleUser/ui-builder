import { TEXT_NODE_TYPE } from './constants'
import type { Page, Project, UiNode } from './types'

/** One element of a project, remembered with where it sits so two snapshots can be compared. */
interface Flat {
  name: string
  type: string
  props: Record<string, unknown>
  classes: string
  responsive: string | undefined
  behavior: string
  /** Where it sits: parent, slot and position. */
  place: string
  parent: string | null
  slot: string
}

const PROP_NAMES: Record<string, string> = { headers: 'columns', items: 'rows' }
const MAX_PROPS_LISTED = 2
const NO_BEHAVIOR = JSON.stringify([undefined, undefined, undefined, undefined])

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`
const quote = (text: string) => `“${text}”`

const flatten = (project: Project): Map<string, Flat> => {
  const found = new Map<string, Flat>()
  const walk = (scope: string, node: UiNode, parent: string | null, slot: string, index: number) => {
    const key = `${scope}:${node.id}`
    found.set(key, {
      name: node.name,
      type: node.type,
      props: node.props,
      classes: node.classes.join(' '),
      responsive: JSON.stringify(node.responsive),
      behavior: JSON.stringify([node.model, node.vIf, node.vFor, node.events]),
      place: `${parent}|${slot}|${index}`,
      parent,
      slot,
    })
    node.children.forEach((child, i) => walk(scope, child, key, '', i))
    for (const [name, nodes] of Object.entries(node.slots))
      nodes.forEach((child, i) => walk(scope, child, key, name, i))
  }
  for (const page of project.pages) walk(page.id, page.root, null, '', 0)
  if (project.layout) walk('layout', project.layout, null, '', 0)
  return found
}

/** Elements in `items` that are not in `others`, leaving out those that only came along with an added (removed) parent. */
const topLevel = (items: Map<string, Flat>, others: Map<string, Flat>) =>
  [...items].filter(
    ([key, flat]) => !others.has(key) && !(flat.parent && !others.has(flat.parent) && items.has(flat.parent)),
  )

/** A text inside a button is named after the button, so “Deleted Button” is never the button itself by mistake. */
const addedLabel = (flat: Flat, items: Map<string, Flat>) =>
  flat.type === TEXT_NODE_TYPE && flat.parent ? `Added text to ${items.get(flat.parent)?.name}` : `Added ${flat.name}`
const removedLabel = (flat: Flat, items: Map<string, Flat>) =>
  flat.type === TEXT_NODE_TYPE && flat.parent
    ? `Deleted the text of ${items.get(flat.parent)?.name}`
    : `Deleted ${flat.name}`

/** Adding or removing a table column or row, which is how people think of those edits. */
function tableShape(old: Flat, now: Flat): string | null {
  for (const [prop, word] of [
    ['headers', 'column'],
    ['items', 'row'],
  ] as const) {
    const before = old.props[prop]
    const after = now.props[prop]
    if (!Array.isArray(before) || !Array.isArray(after) || before.length === after.length) continue
    return after.length < before.length ? `Removed a ${word} from ${now.name}` : `Added a ${word} to ${now.name}`
  }
  return null
}

function describePages(before: Project, after: Project): string | null {
  const was = new Map<string, Page>(before.pages.map(page => [page.id, page]))
  const now = new Map<string, Page>(after.pages.map(page => [page.id, page]))
  const added = after.pages.filter(page => !was.has(page.id))
  const removed = before.pages.filter(page => !now.has(page.id))
  if (added.length + removed.length > 1 || (added.length && removed.length)) return 'Imported a project'
  if (added.length) return `Added page ${quote(added[0].name)}`
  if (removed.length) return `Deleted page ${quote(removed[0].name)}`
  for (const page of after.pages) {
    const old = was.get(page.id)!
    if (old.name !== page.name) return `Renamed page ${quote(old.name)} to ${quote(page.name)}`
    if (old.path !== page.path) return `Changed the route of ${quote(page.name)} to ${page.path}`
  }
  if (before.pages.map(page => page.id).join() !== after.pages.map(page => page.id).join()) return 'Reordered pages'
  if (!before.layout && after.layout) return 'Created the shared layout'
  if (before.layout && !after.layout) return 'Removed the shared layout'
  return null
}

/** Variables are named last: an element that was added together with its variables is named after the element. */
function describeState(before: Project, after: Project): string | null {
  const names = new Set([...Object.keys(before.state), ...Object.keys(after.state)])
  for (const name of names) {
    if (!(name in before.state)) return `Added variable ${name}`
    if (!(name in after.state)) return `Removed variable ${name}`
    if (JSON.stringify(before.state[name]) !== JSON.stringify(after.state[name])) return `Changed variable ${name}`
  }
  return null
}

/** What happened to one element that is in both snapshots, or null when nothing visible did. */
function describeElement(old: Flat, now: Flat, parent: Flat | undefined): string | null {
  if (old.name !== now.name) {
    return now.type === TEXT_NODE_TYPE && parent
      ? `Edited text of ${parent.name}`
      : `Renamed ${old.name} to ${now.name}`
  }
  if (old.parent !== now.parent || old.slot !== now.slot) return `Moved ${now.name}`
  if (old.place !== now.place) return `Reordered ${now.name}`
  const shape = tableShape(old, now)
  if (shape) return shape
  if (JSON.stringify(old.props) !== JSON.stringify(now.props)) {
    const keys = [...new Set([...Object.keys(old.props), ...Object.keys(now.props)])].filter(
      key => JSON.stringify(old.props[key]) !== JSON.stringify(now.props[key]),
    )
    const listed = keys.slice(0, MAX_PROPS_LISTED).map(key => PROP_NAMES[key] ?? key)
    return `Changed ${now.name}: ${listed.join(', ')}${keys.length > MAX_PROPS_LISTED ? '…' : ''}`
  }
  if (old.classes !== now.classes || old.responsive !== now.responsive) return `Changed the style of ${now.name}`
  if (old.behavior !== now.behavior) {
    return now.behavior === NO_BEHAVIOR ? `Removed the behavior of ${now.name}` : `Changed the behavior of ${now.name}`
  }
  return null
}

/**
 * A short, human description of what changed between two project snapshots,
 * such as “Added Data table”, “Changed Orders table: striped” or “Deleted page “Orders””.
 * Worked out from the difference itself, so every kind of edit is named without each one having to say so.
 */
export function describeChange(previous: string, next: string): string {
  let before: Project
  let after: Project
  try {
    before = JSON.parse(previous)
    after = JSON.parse(next)
    if (!Array.isArray(before.pages) || !Array.isArray(after.pages)) return 'Edited the page'
  } catch {
    return 'Edited the page'
  }

  const pageChange = describePages(before, after)
  if (pageChange) return pageChange

  const was = flatten(before)
  const now = flatten(after)
  const added = topLevel(now, was)
  const removed = topLevel(was, now)
  if (added.length && removed.length) return 'Rearranged elements'
  if (added.length)
    return added.length === 1 ? addedLabel(added[0][1], now) : `Added ${plural(added.length, 'element')}`
  if (removed.length) {
    return removed.length === 1 ? removedLabel(removed[0][1], was) : `Deleted ${plural(removed.length, 'element')}`
  }

  const changes: string[] = []
  for (const [key, element] of now) {
    const change = describeElement(was.get(key)!, element, element.parent ? now.get(element.parent) : undefined)
    if (change) changes.push(change)
  }
  // Reordering one element shifts its neighbours too, which should not read as many edits.
  const unique = [...new Set(changes)]
  if (unique.length === 1) return unique[0]
  if (unique.length > 1 && unique.every(change => change.startsWith('Reordered'))) return unique[0]
  if (unique.length) return `Changed ${plural(unique.length, 'element')}`
  return describeState(before, after) ?? 'Edited the page'
}
