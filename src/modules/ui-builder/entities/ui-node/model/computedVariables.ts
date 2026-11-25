import { evaluateExpression, expressionError, expressionVariables } from './expression'
import { cloneNode } from './nodeUtils'
import type { Project } from './types'

type Values = Record<string, unknown>
type Formulas = Record<string, string>

/** The variables a formula reads. Nothing when it cannot be read. */
export const formulaVariables = (formula: string): string[] =>
  expressionError(formula) ? [] : expressionVariables(formula)

/**
 * The variables of a running page: the starting values, plus every computed variable as a property that is worked
 * out when it is read. A formula that cannot be worked out, or that leads back to itself, reads as undefined.
 * Writing to a computed variable does nothing.
 */
export function createRuntimeState(state: Values, computed: Formulas = {}): Values {
  const values: Values = cloneNode(state)
  const evaluating = new Set<string>()
  for (const [name, formula] of Object.entries(computed)) {
    Object.defineProperty(values, name, {
      enumerable: true,
      configurable: true,
      // `this` is the object the value is read from, so a reactive wrapper sees what the formula depends on.
      get(this: Values) {
        if (evaluating.has(name)) return undefined
        evaluating.add(name)
        try {
          return evaluateExpression(formula, this)
        } catch {
          return undefined
        } finally {
          evaluating.delete(name)
        }
      },
      set() {},
    })
  }
  return values
}

/** Every variable an element can read. */
export const variableNames = (project: Pick<Project, 'state' | 'computed'>): string[] => [
  ...Object.keys(project.state),
  ...Object.keys(project.computed ?? {}),
]

export const isComputed = (project: Pick<Project, 'computed'>, name: string) =>
  Object.hasOwn(project.computed ?? {}, name)

/** `names` and every computed variable's own inputs, however deep. */
export function withDependencies(names: Iterable<string>, computed: Formulas = {}): string[] {
  const found = new Set<string>()
  const visit = (name: string) => {
    if (found.has(name)) return
    found.add(name)
    if (Object.hasOwn(computed, name)) formulaVariables(computed[name]).forEach(visit)
  }
  for (const name of names) visit(name)
  return [...found]
}

/** Why `formula` cannot be the value of the computed variable `name`, or null when it can. */
export function formulaError(name: string, formula: string, computed: Formulas = {}): string | null {
  if (!formula.trim()) return 'Enter an expression, such as length(rows).'
  const error = expressionError(formula)
  if (error) return error
  const inputs = formulaVariables(formula)
  const leadsBack = withDependencies(inputs, { ...computed, [name]: formula }).includes(name)
  return leadsBack ? `“${name}” would depend on itself.` : null
}
