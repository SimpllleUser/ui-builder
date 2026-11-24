import { expressionError, expressionVariables } from './expression'
import { AMBIENT_NAMES } from './variableUsage'
import type { Scope } from './runtime'

const VALUE_TEXT_LIMIT = 80

/** A value as it is shown in Preview's list of variables: text in quotes, anything else as JSON, cut when long. */
export const valueToText = (value: unknown, limit = VALUE_TEXT_LIMIT): string =>
  (JSON.stringify(value) ?? 'undefined').slice(0, limit)

export interface HiddenElement {
  id: string
  name: string
  condition: string
  /** In a repeat the same element is hidden for some items and not for others; this is how many copies are hidden. */
  copies: number
  /** The project variables the condition reads, with what they hold now. This is the answer to “why is it hidden?”. */
  reads: Array<{ name: string; value: string }>
  /** The condition also reads `item`, `index` or `value`, which differ from copy to copy and are not shown here. */
  dependsOnRepeat: boolean
}

/**
 * Explains the elements that “show only when” keeps out of sight: what each condition reads and what those variables
 * hold at this moment. One entry per element, even when a repeat hides several copies of it.
 */
export function explainHiddenElements(
  hidden: Array<{ id: string; name: string; condition: string }>,
  state: Scope,
): HiddenElement[] {
  const byId = new Map<string, HiddenElement>()
  for (const entry of hidden) {
    const existing = byId.get(entry.id)
    if (existing) {
      existing.copies++
      continue
    }
    const names = expressionError(entry.condition) ? [] : expressionVariables(entry.condition)
    byId.set(entry.id, {
      id: entry.id,
      name: entry.name,
      condition: entry.condition,
      copies: 1,
      reads: names.filter(name => !AMBIENT_NAMES.has(name)).map(name => ({ name, value: valueToText(state[name]) })),
      dependsOnRepeat: names.some(name => AMBIENT_NAMES.has(name)),
    })
  }
  return [...byId.values()]
}
