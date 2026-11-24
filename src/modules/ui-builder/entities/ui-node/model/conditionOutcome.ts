import { CELL_SLOT_PREFIX } from './componentDefinitions'
import { expressionError, expressionVariables } from './expression'
import { AMBIENT_NAMES } from './variableUsage'
import { evaluateCondition, type Scope } from './runtime'
import type { UiNode } from './types'

export enum StartingOutcome {
  Shown = 'shown',
  Hidden = 'hidden',
}

/**
 * What Preview does with an element that has this condition when it opens, from the variables' starting values.
 * Nothing (null) when that cannot be told: the condition is empty or cannot be read, or it reads `item`, `index`
 * or `value`, which only exist inside a repeat or a table cell.
 */
export function startingOutcome(condition: string, state: Scope): StartingOutcome | null {
  if (!condition.trim() || expressionError(condition)) return null
  if (expressionVariables(condition).some(name => AMBIENT_NAMES.has(name))) return null
  return evaluateCondition(condition, state) ? StartingOutcome.Shown : StartingOutcome.Hidden
}

/** The project variables a condition reads, for creating the ones that do not exist yet. Names that only exist inside a repeat are left out. */
export function conditionVariables(condition: string): string[] {
  if (!condition.trim() || expressionError(condition)) return []
  return expressionVariables(condition).filter(name => !AMBIENT_NAMES.has(name))
}

const REPEAT_ITEM_NAMES = ['item', 'index']
const CELL_ITEM_NAMES = ['item', 'value', 'index']

/**
 * The names an element can use besides the project variables, because it sits inside a repeat (`item`, `index`)
 * or inside a table cell (`item`, `value`, `index`). Its own repeat counts, since the condition is checked per copy.
 */
export function repeatScopeNames(
  node: UiNode,
  findParent: (id: string) => { parent: UiNode; slotName: string | null } | null,
): string[] {
  const names = new Set<string>()
  let current: UiNode | null = node
  while (current) {
    if (current.vFor?.trim()) REPEAT_ITEM_NAMES.forEach(name => names.add(name))
    const location = findParent(current.id)
    if (location?.slotName?.startsWith(CELL_SLOT_PREFIX)) CELL_ITEM_NAMES.forEach(name => names.add(name))
    current = location?.parent ?? null
  }
  return [...names]
}
