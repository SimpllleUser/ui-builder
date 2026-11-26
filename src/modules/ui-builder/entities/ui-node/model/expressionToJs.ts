import type jsep from 'jsep'
import { expressionError, isCoreExpression, parseExpression } from './expression'
import { jsLiteral, jsString } from './jsLiteral'
import { DEFAULT_STATUS_COLOR, STATUS_COLORS } from './statusChips'

/** Small functions an exported file needs for its conditions, copied rows, status chips and input masks. */
export enum HelperName {
  LooseEquals = 'looseEquals',
  IsEmpty = 'isEmpty',
  Contains = 'contains',
  LengthOf = 'lengthOf',
  LowerText = 'lowerText',
  CopyOf = 'copyOf',
  StatusChipColor = 'statusChipColor',
  StatusChipKeys = 'statusChipKeys',
  ApplyInputMask = 'applyInputMask',
  WithoutFirst = 'withoutFirst',
}

/** Same behaviour as the editor's evaluator, so an exported page decides like Preview does. */
export const HELPER_SOURCE: Record<HelperName, string> = {
  [HelperName.LooseEquals]:
    "const looseEquals = (a, b) => (a !== null && typeof a === 'object') || (b !== null && typeof b === 'object') ? a === b : String(a) === String(b)",
  [HelperName.IsEmpty]:
    "const isEmpty = value => value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)",
  [HelperName.Contains]:
    "const contains = (collection, item) => typeof collection === 'string' ? collection.includes(String(item)) : Array.isArray(collection) && collection.some(entry => looseEquals(entry, item))",
  [HelperName.LengthOf]:
    "const lengthOf = value => (typeof value === 'string' || Array.isArray(value) ? value.length : 0)",
  [HelperName.LowerText]: "const lowerText = value => String(value ?? '').toLowerCase()",
  [HelperName.CopyOf]: 'const copyOf = value => (value === undefined ? undefined : JSON.parse(JSON.stringify(value)))',
  [HelperName.StatusChipColor]: `const statusChipColors = ${jsLiteral(STATUS_COLORS)}
const statusChipColor = value => {
  const status = String(value ?? '').toLowerCase()
  return Object.hasOwn(statusChipColors, status) ? statusChipColors[status] : ${jsString(DEFAULT_STATUS_COLOR)}
}`,
  [HelperName.StatusChipKeys]:
    "const statusChipKeys = headers => (Array.isArray(headers) ? headers.filter(header => header?.chip && typeof header.key === 'string').map(header => header.key) : [])",
  [HelperName.WithoutFirst]: `const withoutFirst = (list, value) => {
  const index = list.findIndex(entry => JSON.stringify(entry) === JSON.stringify(value))
  return index < 0 ? list : list.filter((_, position) => position !== index)
}`,
  // The same steps as `applyMask` of the editor: `#` takes a digit, `A` a letter, anything else is written as it is.
  [HelperName.ApplyInputMask]: `const applyInputMask = (value, mask) => {
  if (typeof value !== 'string' || !mask) return value
  let result = ''
  let cursor = 0
  for (const token of mask) {
    if (cursor >= value.length) break
    if (token === '#' || token === 'A') {
      const pattern = token === '#' ? /\\d/ : /[A-Za-z]/
      while (cursor < value.length && !pattern.test(value[cursor])) cursor++
      if (cursor >= value.length) break
      result += value[cursor++]
    } else {
      result += token
      if (value[cursor] === token) cursor++
    }
  }
  return result
}`,
}

/** Helpers a helper calls itself, in the order they must be written. */
const DEPENDENCIES: Partial<Record<HelperName, HelperName[]>> = { [HelperName.Contains]: [HelperName.LooseEquals] }

const FUNCTION_HELPERS: Record<string, HelperName> = {
  length: HelperName.LengthOf,
  empty: HelperName.IsEmpty,
  contains: HelperName.Contains,
  lower: HelperName.LowerText,
}

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype'])
const NUMERIC_OPERATORS = new Set(['<', '<=', '>', '>=', '-', '*', '/', '%'])

export function addHelper(helpers: Set<HelperName>, name: HelperName) {
  for (const dependency of DEPENDENCIES[name] ?? []) helpers.add(dependency)
  helpers.add(name)
}

/** The helper definitions in the order of the enum, which lists a helper after the ones it calls. */
export const helperSources = (helpers: ReadonlySet<HelperName>) =>
  Object.values(HelperName)
    .filter(name => helpers.has(name))
    .map(name => HELPER_SOURCE[name])

/**
 * A condition as a JavaScript expression with the same result as in the editor. Missing values read as `undefined`
 * (optional chaining), numbers are compared as numbers, and a word that is not a variable next to `==` is text.
 * A condition that cannot be read is `true`, because Preview shows the element in that case.
 */
export function expressionToJs(
  text: string,
  known: ReadonlySet<string>,
  helpers: Set<HelperName>,
  /** How a variable is written; a script has to read a ref's `.value`, a template does not. */
  identifier: (name: string) => string = name => name,
): string {
  if (expressionError(text)) return 'true'
  const emit = (node: jsep.Expression): string => {
    if (!isCoreExpression(node)) return 'undefined'
    switch (node.type) {
      case 'Literal':
        return typeof node.value === 'string' ? jsString(node.value) : jsLiteral(node.value)
      case 'Identifier':
        return FORBIDDEN_KEYS.has(node.name) ? 'undefined' : identifier(node.name)
      case 'MemberExpression': {
        if (!node.computed && isCoreExpression(node.property) && node.property.type === 'Identifier') {
          return FORBIDDEN_KEYS.has(node.property.name) ? 'undefined' : `${emit(node.object)}?.${node.property.name}`
        }
        return `${emit(node.object)}?.[${emit(node.property)}]`
      }
      case 'UnaryExpression': {
        const argument = emit(node.argument)
        if (node.operator === '-') return `-Number(${argument})`
        if (node.operator === '+') return `Number(${argument})`
        return `!${argument}`
      }
      case 'BinaryExpression':
        return emitBinary(node)
      case 'ConditionalExpression':
        return `(${emit(node.test)} ? ${emit(node.consequent)} : ${emit(node.alternate)})`
      case 'ArrayExpression':
        return `[${node.elements.map(element => (element ? emit(element) : 'undefined')).join(', ')}]`
      case 'CallExpression': {
        const name = isCoreExpression(node.callee) && node.callee.type === 'Identifier' ? node.callee.name : ''
        const helper = FUNCTION_HELPERS[name]
        addHelper(helpers, helper)
        return `${helper}(${node.arguments.map(emit).join(', ')})`
      }
      default:
        return 'undefined'
    }
  }

  const emitBinary = (node: jsep.BinaryExpression): string => {
    const { operator } = node
    const isEquality = operator === '==' || operator === '!='
    const operand = (side: jsep.Expression) =>
      isEquality && isCoreExpression(side) && side.type === 'Identifier' && !known.has(side.name)
        ? jsString(side.name)
        : emit(side)
    const left = operand(node.left)
    const right = operand(node.right)
    if (operator === '&&' || operator === 'and') return `(${left} && ${right})`
    if (operator === '||' || operator === 'or') return `(${left} || ${right})`
    if (isEquality) {
      addHelper(helpers, HelperName.LooseEquals)
      return `${operator === '!=' ? '!' : ''}looseEquals(${left}, ${right})`
    }
    if (NUMERIC_OPERATORS.has(operator)) return `(Number(${left}) ${operator} Number(${right}))`
    return `(${left} ${operator} ${right})`
  }

  return emit(parseExpression(text))
}
