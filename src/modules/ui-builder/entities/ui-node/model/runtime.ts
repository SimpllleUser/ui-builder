import { evaluateExpression, expressionError, type Scope } from './expression'

/** Variables visible to bindings: project state plus `item`/`index` inside a repeated element. */
export type { Scope }

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

/** Fills the bindings of every text inside a parsed value; a text that is one binding keeps the value's type. */
export function interpolateDeep(value: unknown, scope: Scope): unknown {
  if (Array.isArray(value)) return value.map(item => interpolateDeep(item, scope))
  if (value !== null && typeof value === 'object')
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, interpolateDeep(item, scope)]))
  return interpolate(value, scope)
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

/** Why a condition cannot be used, or null when it is fine (or empty). */
export const conditionError = expressionError

/** An empty or unreadable condition shows the element, so a typo never hides content in preview. */
export function evaluateCondition(expression: string | undefined, scope: Scope): boolean {
  if (!expression?.trim() || expressionError(expression)) return true
  return Boolean(evaluateExpression(expression, scope))
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
