import jsep from 'jsep'

/**
 * Conditions (`vIf`) are real expressions: `age >= 18 and role == "admin"`, `!(loading || empty(rows))`,
 * `step in [1, 2]`-style checks through `contains`, `count > 0 ? ok : none`.
 *
 * `jsep` only turns the text into a syntax tree; it never runs anything. The tree is walked by the small
 * evaluator below, which knows a fixed set of operators and functions, so a condition cannot reach
 * `window`, call methods or touch prototypes.
 */

export type Scope = Record<string, unknown>

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

// Friendlier spellings for people who do not write code. Same precedence as `||`, `&&` and `!`.
const OR_PRECEDENCE = 1
const AND_PRECEDENCE = 2
jsep.addBinaryOp('or', OR_PRECEDENCE)
jsep.addBinaryOp('and', AND_PRECEDENCE)
jsep.addUnaryOp('not')
// Objects and quotes of code are not needed here; `{{ }}` is turned into plain names before parsing.
jsep.removeBinaryOp('|')
jsep.removeBinaryOp('&')
jsep.removeBinaryOp('^')
jsep.removeBinaryOp('<<')
jsep.removeBinaryOp('>>')
jsep.removeBinaryOp('>>>')

/** Functions a condition may call. Anything else is rejected before it runs. */
const FUNCTIONS: Record<string, (...args: unknown[]) => unknown> = {
  length: value => (typeof value === 'string' || Array.isArray(value) ? value.length : 0),
  empty: value => value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0),
  contains: (collection, item) =>
    typeof collection === 'string'
      ? collection.includes(String(item))
      : Array.isArray(collection) && collection.some(entry => looselyEqual(entry, item)),
}

/** The tree from `jsep` is typed per node kind only on the library's own union, so this tells TypeScript so. */
function isCoreExpression(node: jsep.Expression): node is jsep.CoreExpression {
  return typeof node.type === 'string'
}

/** `{{ path }}` is allowed inside a condition (it is how saved-component parameters look) and means just `path`. */
const BINDING = /\{\{\s*([^{}]+?)\s*\}\}/g
const stripBindings = (text: string) => text.replace(BINDING, '$1')

const parsed = new Map<string, jsep.Expression>()

function parse(text: string): jsep.Expression {
  const source = stripBindings(text)
  let tree = parsed.get(source)
  if (!tree) {
    tree = jsep(source)
    parsed.set(source, tree)
  }
  return tree
}

function looselyEqual(a: unknown, b: unknown): boolean {
  if (a !== null && typeof a === 'object') return a === b
  if (b !== null && typeof b === 'object') return false
  return String(a) === String(b)
}

function readMember(target: unknown, key: unknown): unknown {
  const name = String(key)
  if (FORBIDDEN_KEYS.has(name) || target === null || typeof target !== 'object') return undefined
  return Object.hasOwn(target, name) ? (target as Record<string, unknown>)[name] : undefined
}

const COMPARISONS: Record<string, (a: unknown, b: unknown) => unknown> = {
  '==': looselyEqual,
  '===': (a, b) => a === b,
  '!=': (a, b) => !looselyEqual(a, b),
  '!==': (a, b) => a !== b,
  '>=': (a, b) => Number(a) >= Number(b),
  '<=': (a, b) => Number(a) <= Number(b),
  '>': (a, b) => Number(a) > Number(b),
  '<': (a, b) => Number(a) < Number(b),
  '+': (a, b) => (typeof a === 'string' || typeof b === 'string' ? `${a}${b}` : Number(a) + Number(b)),
  '-': (a, b) => Number(a) - Number(b),
  '*': (a, b) => Number(a) * Number(b),
  '/': (a, b) => Number(a) / Number(b),
  '%': (a, b) => Number(a) % Number(b),
}

/**
 * `status == paid` was valid before real expressions existed: the right side is a word, not a variable.
 * A name that is not a variable, next to `==` or `!=`, therefore still reads as that word.
 */
function isUnknownName(node: jsep.Expression, scope: Scope): node is jsep.Identifier {
  return isCoreExpression(node) && node.type === 'Identifier' && !(node.name in scope)
}

function evaluateNode(node: jsep.Expression, scope: Scope): unknown {
  if (!isCoreExpression(node)) throw new Error('Unsupported expression.')
  switch (node.type) {
    case 'Literal':
      return node.value
    case 'Identifier':
      return readMember(scope, node.name)
    case 'MemberExpression': {
      const key = node.computed ? evaluateNode(node.property, scope) : evaluatePropertyName(node.property)
      return readMember(evaluateNode(node.object, scope), key)
    }
    case 'UnaryExpression': {
      const value = evaluateNode(node.argument, scope)
      if (node.operator === '!' || node.operator === 'not') return !value
      if (node.operator === '-') return -Number(value)
      if (node.operator === '+') return Number(value)
      throw new Error(`Operator ${node.operator} is not supported.`)
    }
    case 'BinaryExpression':
      return evaluateBinary(node, scope)
    case 'ConditionalExpression':
      return evaluateNode(node.test, scope) ? evaluateNode(node.consequent, scope) : evaluateNode(node.alternate, scope)
    case 'ArrayExpression':
      return node.elements.map(element => (element ? evaluateNode(element, scope) : undefined))
    case 'CallExpression':
      return evaluateCall(node, scope)
    default:
      throw new Error('Unsupported expression.')
  }
}

function evaluatePropertyName(property: jsep.Expression): string {
  if (!isCoreExpression(property) || property.type !== 'Identifier') throw new Error('Unsupported property.')
  return property.name
}

function evaluateBinary(node: jsep.BinaryExpression, scope: Scope): unknown {
  const { operator } = node
  if (operator === '&&' || operator === 'and') return evaluateNode(node.left, scope) && evaluateNode(node.right, scope)
  if (operator === '||' || operator === 'or') return evaluateNode(node.left, scope) || evaluateNode(node.right, scope)
  const compare = COMPARISONS[operator]
  if (!compare) throw new Error(`Operator ${operator} is not supported.`)
  const isEquality = operator === '==' || operator === '!='
  const side = (operand: jsep.Expression) =>
    isEquality && isUnknownName(operand, scope) ? operand.name : evaluateNode(operand, scope)
  return compare(side(node.left), side(node.right))
}

function evaluateCall(node: jsep.CallExpression, scope: Scope): unknown {
  const callee = isCoreExpression(node.callee) && node.callee.type === 'Identifier' ? node.callee.name : ''
  const run = Object.hasOwn(FUNCTIONS, callee) ? FUNCTIONS[callee] : undefined
  if (!run) throw new Error(`Function ${callee || '?'} is not available. Use length, empty or contains.`)
  return run(...node.arguments.map(argument => evaluateNode(argument, scope)))
}

/** Why the text is not a usable expression, or null when it is. Empty text is fine (no condition). */
export function expressionError(text: string | undefined): string | null {
  if (!text?.trim()) return null
  try {
    assertSupported(parse(text))
    return null
  } catch (error) {
    return error instanceof Error ? error.message.replace(/ at character \d+$/, '') : 'Cannot read this condition.'
  }
}

/** Walks the tree once without data so an unsupported operator or function is reported while typing. */
function assertSupported(node: jsep.Expression): void {
  if (!isCoreExpression(node)) throw new Error('Unsupported expression.')
  switch (node.type) {
    case 'Literal':
    case 'Identifier':
      return
    case 'MemberExpression':
      assertSupported(node.object)
      if (node.computed) assertSupported(node.property)
      else evaluatePropertyName(node.property)
      return
    case 'UnaryExpression':
      if (!['!', 'not', '-', '+'].includes(node.operator))
        throw new Error(`Operator ${node.operator} is not supported.`)
      assertSupported(node.argument)
      return
    case 'BinaryExpression':
      if (!['&&', 'and', '||', 'or'].includes(node.operator) && !COMPARISONS[node.operator])
        throw new Error(`Operator ${node.operator} is not supported.`)
      assertSupported(node.left)
      assertSupported(node.right)
      return
    case 'ConditionalExpression':
      assertSupported(node.test)
      assertSupported(node.consequent)
      assertSupported(node.alternate)
      return
    case 'ArrayExpression':
      node.elements.forEach(element => element && assertSupported(element))
      return
    case 'CallExpression': {
      const name = isCoreExpression(node.callee) && node.callee.type === 'Identifier' ? node.callee.name : ''
      if (!Object.hasOwn(FUNCTIONS, name))
        throw new Error(`Function ${name || '?'} is not available. Use length, empty or contains.`)
      node.arguments.forEach(assertSupported)
      return
    }
    default:
      throw new Error('This part of the condition is not supported.')
  }
}

/** Value of an expression for the given variables. Throws on text that `expressionError` reports. */
export function evaluateExpression(text: string, scope: Scope): unknown {
  return evaluateNode(parse(text), scope)
}

/**
 * Variables a condition reads, for checking that they exist. Function names and `a.b` property names are
 * not variables. A bare word right of `==` / `!=` is skipped because it may be the old unquoted text form (`status == paid`).
 */
export function expressionVariables(text: string): string[] {
  const names = new Set<string>()
  const collect = (node: jsep.Expression, skipBareWord = false): void => {
    if (!isCoreExpression(node)) return
    switch (node.type) {
      case 'Identifier':
        if (!skipBareWord) names.add(node.name)
        return
      case 'MemberExpression':
        collect(node.object)
        if (node.computed) collect(node.property)
        return
      case 'UnaryExpression':
        return collect(node.argument)
      case 'BinaryExpression': {
        const isEquality = node.operator === '==' || node.operator === '!='
        collect(node.left)
        return collect(node.right, isEquality)
      }
      case 'ConditionalExpression':
        return [node.test, node.consequent, node.alternate].forEach(part => collect(part))
      case 'ArrayExpression':
        return node.elements.forEach(element => element && collect(element))
      case 'CallExpression':
        return node.arguments.forEach(argument => collect(argument))
      default:
    }
  }
  collect(parse(text))
  return [...names]
}
