import { describeAction } from './actions'
import { EventName } from './enums'
import { eventEntries } from './events'
import { ruleLabel } from './validationRules'
import type { UiNode } from './types'

/** The things an element can be made to do in Preview, as they are shown on the canvas and in Layers. */
export enum BehaviorBadge {
  Repeat = 'repeat',
  Condition = 'condition',
  Link = 'link',
  Click = 'click',
  Event = 'event',
  Rules = 'rules',
}

export interface BehaviorNote {
  badge: BehaviorBadge
  /** One or two words for a small marker on the canvas. */
  shortLabel: string
  /** A full sentence for a tooltip or a screen reader. */
  description: string
}

const filled = (text: string | undefined): text is string => !!text?.trim()

const EVENT_PHRASES: Record<EventName, string> = {
  [EventName.Click]: 'On click',
  [EventName.Change]: 'On change',
  [EventName.Submit]: 'On submit',
  [EventName.Mounted]: 'When it appears',
}

/** What Behavior an element carries, in the order Preview applies it (repeat, condition, link, events, rules). */
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
  for (const [event, actions] of eventEntries(node.events))
    notes.push({
      badge: event === EventName.Click ? BehaviorBadge.Click : BehaviorBadge.Event,
      shortLabel: event,
      description: `${EVENT_PHRASES[event]}: ${actions.map(describeAction).join(', then ')}`,
    })
  if (node.rules?.length)
    notes.push({
      badge: BehaviorBadge.Rules,
      shortLabel: 'rules',
      description: `Checked: ${node.rules.map(rule => ruleLabel(rule.type).toLowerCase()).join(', ')}`,
    })
  return notes
}

/** The attribute the canvas styles into a small marker, such as `for · if`. Nothing when the element has no behavior. */
export function behaviorMarker(node: UiNode): Record<string, string> {
  const notes = describeBehaviors(node)
  return notes.length ? { 'data-behavior': notes.map(note => note.shortLabel).join(' · ') } : {}
}
