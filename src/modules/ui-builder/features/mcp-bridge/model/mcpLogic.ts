import {
  actionExamples,
  actionFromInput,
  EventName,
  isRuleType,
  MAX_ACTIONS_PER_EVENT,
  RuleType,
  type UiAction,
  type UiNodeEvents,
  type ValidationRule,
  withActions,
} from '../../../entities/ui-node'

const toAction = (input: unknown): UiAction => {
  const action = input && typeof input === 'object' ? actionFromInput(input) : null
  if (action) return action
  const shapes = new Intl.ListFormat('en', { type: 'disjunction' }).format(actionExamples())
  throw new Error(`Invalid action: ${JSON.stringify(input)}. Use ${shapes}.`)
}

/**
 * The events of an element with those an agent named replaced: one action, a list that runs in order, or null to
 * clear. Events not named keep what they have.
 */
export function eventsFromInput(
  current: UiNodeEvents | undefined,
  input: Record<string, unknown>,
): UiNodeEvents | undefined {
  return Object.values(EventName).reduce((events, name) => {
    if (input[name] === undefined) return events
    const list = input[name] === null ? [] : [input[name]].flat()
    if (list.length > MAX_ACTIONS_PER_EVENT)
      throw new Error(`An event can have at most ${MAX_ACTIONS_PER_EVENT} actions.`)
    return withActions(events, name, list.map(toAction))
  }, current)
}

export function rulesFromInput(input: unknown): ValidationRule[] {
  if (input === null) return []
  if (!Array.isArray(input)) throw new Error('rules must be a list, or null to clear.')
  return input.map(rule => {
    const { type, value, message } = (rule ?? {}) as Record<string, unknown>
    if (!isRuleType(type))
      throw new Error(`Unknown rule “${String(type)}”. Use one of: ${Object.values(RuleType).join(', ')}.`)
    return {
      type,
      ...(value === undefined ? {} : { value: String(value) }),
      ...(typeof message === 'string' && message ? { message } : {}),
    }
  })
}
