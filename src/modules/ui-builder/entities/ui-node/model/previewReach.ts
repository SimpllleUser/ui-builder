import { behaviorOf } from './componentBehaviors'
import { evaluateCondition, interpolateProps, repeatItems, type Scope } from './runtime'
import type { UiNode } from './types'

/** Whether the content of this slot is drawn with names of its own, such as a table cell with `value`. */
const hasOwnNames = (owner: UiNode, child: UiNode) =>
  Object.entries(owner.slots).some(
    ([slot, nodes]) => nodes.includes(child) && behaviorOf(owner.type).slotParams?.(slot).length,
  )

/**
 * Why a person could not use the last element of `path` in Preview now, or null when they could. Below a repeat or
 * a table cell the conditions read values that differ from copy to copy, so those are not judged.
 */
export function previewObstacle(path: UiNode[], state: Scope): string | null {
  const target = path[path.length - 1]
  for (const [index, node] of path.entries()) {
    const items = repeatItems(node.vFor, state)
    if (items && !items.length) return `“${target.name}” is not shown: there is nothing to repeat.`
    if (items) return null
    const named = node === target ? '' : ` (inside “${node.name}”)`
    if (node.vIf && !evaluateCondition(node.vIf, state))
      return `“${target.name}” is hidden${named}: its condition ${node.vIf} is not met.`
    if (interpolateProps(node.props, state).disabled === true) return `“${target.name}” is disabled${named}.`
    const next = path[index + 1]
    if (next && hasOwnNames(node, next)) return null
  }
  return null
}
