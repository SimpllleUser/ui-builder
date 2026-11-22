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

/** Supports `key`, `!key`, `key == value` and `key != value`. An empty or invalid condition shows the element. */
export function evaluateCondition(expression: string | undefined, scope: Scope): boolean {
  if (!expression?.trim()) return true
  const match = /^\s*(!)?\s*([A-Za-z_$][\w$.[\]]*)\s*(?:(==|!=)\s*(.+?))?\s*$/.exec(expression)
  if (!match) return true
  const [, negate, path, operator, literal] = match
  const value = resolvePath(path, scope)
  if (operator) {
    const equal = String(value) === String(parseLiteral(literal))
    return operator === '==' ? equal : !equal
  }
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

/** Fills `{{ item.id }}`-style values of an action from the scope it was triggered in (e.g. a table row). */
export function bindAction(action: UiAction, scope: Scope): UiAction {
  const text = (value: string) => String(interpolate(value, scope) ?? '')
  if (action.type === 'navigate') return { ...action, to: text(action.to) }
  if (action.type === 'set') return { ...action, value: text(action.value) }
  return action
}

export function runAction(action: UiAction | undefined, host: RuntimeHost) {
  if (!action) return
  if (action.type === 'navigate') host.navigate(action.to)
  else if (action.type === 'set' && action.key) host.state[action.key] = parseLiteral(action.value)
  else if (action.type === 'toggle' && action.key) host.state[action.key] = !host.state[action.key]
}
