import { behaviorOf } from './componentBehaviors'
import { EventName } from './enums'
import type { UiAction, UiNodeEvents } from './types'

export const MAX_ACTIONS_PER_EVENT = 20

export const EVENT_LABELS: Record<EventName, string> = {
  [EventName.Click]: 'When clicked',
  [EventName.Change]: 'When the value changes',
  [EventName.Submit]: 'When the form is submitted',
  [EventName.Mounted]: 'When it appears',
}

/** The events a component of this type has, in the order they are offered. */
export function eventsFor(type: string): EventName[] {
  const { hasValue, isForm } = behaviorOf(type)
  return [
    ...(isForm ? [EventName.Submit] : [EventName.Click]),
    ...(hasValue ? [EventName.Change] : []),
    EventName.Mounted,
  ]
}

export function actionsOf(events: UiNodeEvents | undefined, name: EventName): UiAction[] {
  const actions = events?.[name]
  if (!actions) return []
  return Array.isArray(actions) ? actions : [actions]
}

export const eventEntries = (events: UiNodeEvents | undefined): Array<[EventName, UiAction[]]> =>
  Object.values(EventName).flatMap(name => {
    const actions = actionsOf(events, name)
    return actions.length ? [[name, actions] as [EventName, UiAction[]]] : []
  })

/** The events with the actions of one replaced. Undefined when no event does anything. */
export function withActions(
  events: UiNodeEvents | undefined,
  name: EventName,
  actions: UiAction[],
): UiNodeEvents | undefined {
  const next = { ...events }
  if (actions.length > 1) next[name] = actions
  else if (actions.length === 1) next[name] = actions[0]
  else delete next[name]
  return Object.keys(next).length ? next : undefined
}
