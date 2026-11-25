import { describeAction } from './actions'
import type { UiNode } from './types'

/** The four things an element can be made to do in Preview, as they are shown on the canvas and in Layers. */
export enum BehaviorBadge {
  Repeat = 'repeat',
  Condition = 'condition',
  Link = 'link',
  Click = 'click',
}

export interface BehaviorNote {
  badge: BehaviorBadge
  /** One or two words for a small marker on the canvas. */
  shortLabel: string
  /** A full sentence for a tooltip or a screen reader. */
  description: string
}

const filled = (text: string | undefined): text is string => !!text?.trim()

/** What Behavior an element carries, in the order Preview applies it (repeat, condition, link, click). */
export function describeBehaviors(node: UiNode): BehaviorNote[] {
  const notes: BehaviorNote[] = []
  if (filled(node.vFor))
    notes.push({
      badge: BehaviorBadge.Repeat,
      shortLabel: 'for',
      description: `Repeats for each item of ${node.vFor.trim()}`,
    })
  if (filled(node.vIf))
    notes.push({
      badge: BehaviorBadge.Condition,
      shortLabel: 'if',
      description: `Shown only when ${node.vIf.trim()}`,
    })
  if (filled(node.model))
    notes.push({
      badge: BehaviorBadge.Link,
      shortLabel: 'link',
      description: `Linked to the variable ${node.model.trim()}`,
    })
  const click = node.events?.click
  if (click)
    notes.push({ badge: BehaviorBadge.Click, shortLabel: 'click', description: `On click: ${describeAction(click)}` })
  return notes
}

/** The attribute the canvas styles into a small marker, such as `for · if`. Nothing when the element has no behavior. */
export function behaviorMarker(node: UiNode): Record<string, string> {
  const notes = describeBehaviors(node)
  return notes.length ? { 'data-behavior': notes.map(note => note.shortLabel).join(' · ') } : {}
}
