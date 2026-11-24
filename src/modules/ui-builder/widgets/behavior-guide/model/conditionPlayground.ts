import { conditionError, evaluateCondition } from '../../../entities/ui-node'

export enum PlaygroundOutcome {
  Shown = 'shown',
  Hidden = 'hidden',
  /** The condition cannot be read. Preview shows the element in this case, so a typo never hides content. */
  Unreadable = 'unreadable',
}

export type PlaygroundScope = Record<string, unknown>

export interface ParsedVariables {
  scope: PlaygroundScope
  problem: string | null
}

export interface PlaygroundResult {
  outcome: PlaygroundOutcome
  /** Why the condition cannot be read, to show beside the condition field. */
  problem: string | null
}

const NOT_AN_OBJECT = 'Write the variables as a JSON object, for example {"age": 20}.'

/** Variables typed as JSON. Anything that is not an object leaves the scope empty and says why. */
export function parseVariables(json: string): ParsedVariables {
  if (!json.trim()) return { scope: {}, problem: null }
  try {
    const value: unknown = JSON.parse(json)
    if (value === null || typeof value !== 'object' || Array.isArray(value))
      return { scope: {}, problem: NOT_AN_OBJECT }
    return { scope: Object.fromEntries(Object.entries(value)), problem: null }
  } catch {
    return { scope: {}, problem: NOT_AN_OBJECT }
  }
}

/** What Preview would do with an element carrying this condition when the variables have these values. */
export function evaluateSample(condition: string, scope: PlaygroundScope): PlaygroundResult {
  const problem = conditionError(condition)
  if (problem) return { outcome: PlaygroundOutcome.Unreadable, problem }
  const shown = evaluateCondition(condition, scope)
  return { outcome: shown ? PlaygroundOutcome.Shown : PlaygroundOutcome.Hidden, problem: null }
}
