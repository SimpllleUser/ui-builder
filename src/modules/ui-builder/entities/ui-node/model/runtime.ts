import type { UiAction } from './types'

/** Variables visible to bindings: project state plus `item`/`index` inside a repeated element. */
export type Scope = Record<string, unknown>

const FORBIDDEN = new Set(['__proto__', 'constructor', 'prototype'])
const PATH = /^[A-Za-z_$][\w$]*(?:\.[\w$]+|\[\d+\])*$/
const FULL_BINDING = /^\s*\{\{\s*([^{}]+?)\s*\}\}\s*$/
const BINDING = /\{\{\s*([^{}]+?)\s*\}\}/g

/** Reads `a.b[0].c` from scope without evaluating code. */
export function resolvePath(path: string, scope: Scope): unknown {
  if (!PATH.test(path)) return undefined
  let value: unknown = scope
  for (const part of path.split(/\.|\[|\]/).filter(Boolean)) {
    if (FORBIDDEN.has(part) || value === null || typeof value !== 'object') return undefined
    value = (value as Record<string, unknown>)[part]
  }
  return value
}

/** `{{ path }}` alone keeps the value's type (arrays for tables); mixed text is stringified. */
export function interpolate(value: unknown, scope: Scope): unknown {
  if (typeof value !== 'string' || !value.includes('{{')) return value
  const full = FULL_BINDING.exec(value)
  if (full) return resolvePath(full[1], scope)
  return value.replace(BINDING, (_, path: string) => {
    const resolved = resolvePath(path, scope)
    return resolved === undefined || resolved === null ? '' : String(resolved)
  })
}

export function interpolateProps(props: Record<string, unknown>, scope: Scope): Record<string, unknown> {
  return Object.fromEntries(Object.entries(props).map(([key, value]) => [key, interpolate(value, scope)]))
}

export function parseLiteral(text: string): unknown {
  const trimmed = text.trim()
  try {
    return JSON.parse(trimmed)
  } catch {
    /* plain text */
  }
  return trimmed.replace(/^(['"])(.*)\1$/, '$2')
}

const COMPARISONS: Record<string, (a: unknown, b: unknown) => boolean> = {
  '==': (a, b) => String(a) === String(b),
  '!=': (a, b) => String(a) !== String(b),
  '>=': (a, b) => Number(a) >= Number(b),
  '<=': (a, b) => Number(a) <= Number(b),
  '>': (a, b) => Number(a) > Number(b),
  '<': (a, b) => Number(a) < Number(b),
}

/**
 * Supports `key`, `!key`, and comparisons `key == value`, `!=`, `>=`, `<=`, `>`, `<` (numeric for the last four).
 * Paths may be dotted (`selected.step >= 2`). An empty or invalid condition shows the element.
 */
export function evaluateCondition(expression: string | undefined, scope: Scope): boolean {
  if (!expression?.trim()) return true
  const match = /^\s*(!)?\s*([A-Za-z_$][\w$.[\]]*)\s*(?:(==|!=|>=|<=|>|<)\s*(.+?))?\s*$/.exec(expression)
  if (!match) return true
  const [, negate, path, operator, literal] = match
  const value = resolvePath(path, scope)
  if (operator) return COMPARISONS[operator](value, parseLiteral(literal))
  return negate ? !value : !!value
}

/** Items to repeat an element for: an array, or `n` copies when the source is a number. */
export function repeatItems(source: string | undefined, scope: Scope): unknown[] | null {
  if (!source?.trim()) return null
  const value = resolvePath(source.trim(), scope)
  if (Array.isArray(value)) return value
  if (typeof value === 'number' && Number.isFinite(value))
    return Array.from({ length: Math.min(Math.max(0, Math.floor(value)), 500) }, (_, i) => i + 1)
  return []
}

export function applyMask(value: unknown, mask: string): string {
  const input = String(value ?? '')
  let result = ''
  let cursor = 0
  for (const token of mask) {
    if (cursor >= input.length) break
    if (token === '#' || token === 'A') {
      const pattern = token === '#' ? /\d/ : /[A-Za-z]/
      while (cursor < input.length && !pattern.test(input[cursor])) cursor++
      if (cursor >= input.length) break
      result += input[cursor++]
    } else {
      result += token
      if (input[cursor] === token) cursor++
    }
  }
  return result
}

export interface RuntimeHost {
  state: Record<string, unknown>
  navigate: (path: string) => void
}

/** An action whose `{{ }}` values were filled in. A `set` value that was a single binding keeps its type (e.g. a whole row). */
export type BoundAction = Exclude<UiAction, { type: 'set' }> | { type: 'set'; key: string; value: unknown }

/** Fills `{{ item.id }}`-style values of an action from the scope it was triggered in (e.g. a table row). */
export function bindAction(action: UiAction, scope: Scope): BoundAction {
  if (action.type === 'navigate') return { ...action, to: String(interpolate(action.to, scope) ?? '') }
  if (action.type === 'set') {
    const value = interpolate(action.value, scope)
    // Copy objects so the saved selection does not change with the table it came from.
    return { ...action, value: value !== null && typeof value === 'object' ? JSON.parse(JSON.stringify(value)) : value }
  }
  return action
}

export function runAction(action: UiAction | BoundAction | undefined, host: RuntimeHost) {
  if (!action) return
  if (action.type === 'navigate') host.navigate(action.to)
  else if (action.type === 'set' && action.key) {
    host.state[action.key] = typeof action.value === 'string' ? parseLiteral(action.value) : action.value
  } else if (action.type === 'toggle' && action.key) host.state[action.key] = !host.state[action.key]
}
