import { behaviorOf } from './componentBehaviors'
import { evaluateCondition, interpolateProps, repeatItems, type Scope } from './runtime'
import type { UiNode } from './types'

/** Whether the content of this slot is drawn with names of its own, such as a table cell with `value`. */
const hasOwnNames = (owner: UiNode, child: UiNode) =>
  Object.entries(owner.slots).some(
    ([slot, nodes]) => nodes.includes(child) && behaviorOf(owner.type).slotParams?.(slot).length,
  )

export interface PreviewReach {
  /**
   * One entry for each copy of the element a person can use now, in the order shown, holding the names that exist
   * only in that copy (`item` and `index` of a repeat).
   */
  copies: Scope[]
  /** Why there is no such copy, or null. */
  obstacle: string | null
}

/**
 * Which copies of the last element of `path` a person could use in Preview now. Below a table cell the conditions
 * read values of their row, so those are not judged.
 */
export function previewReach(path: UiNode[], state: Scope): PreviewReach {
  const target = path[path.length - 1]
  let copies: Scope[] = [{}]
  const blocked = (reason: string): PreviewReach => ({ copies: [], obstacle: `“${target.name}” ${reason}` })

  for (const [index, node] of path.entries()) {
    const named = node === target ? '' : ` (inside “${node.name}”)`
    if (node.vFor) {
      copies = copies.flatMap(own =>
        (repeatItems(node.vFor, { ...state, ...own }) ?? []).map((item, at) => ({ ...own, item, index: at })),
      )
      if (!copies.length) return blocked('is not shown: there is nothing to repeat.')
    }
    if (node.vIf) {
      copies = copies.filter(own => evaluateCondition(node.vIf, { ...state, ...own }))
      if (!copies.length) return blocked(`is hidden${named}: its condition ${node.vIf} is not met.`)
    }
    copies = copies.filter(own => interpolateProps(node.props, { ...state, ...own }).disabled !== true)
    if (!copies.length) return blocked(`is disabled${named}.`)
    const next = path[index + 1]
    if (next && hasOwnNames(node, next)) break
  }
  return { copies, obstacle: null }
}
