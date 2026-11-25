import { RuleType } from './enums'
import { addHelper, HelperName } from './expressionToJs'
import { jsString } from './jsLiteral'
import type { ValidationRule } from './types'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const isBlank = (value: unknown) =>
  value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)
const lengthOf = (value: unknown) => (Array.isArray(value) ? value.length : String(value).length)

interface RuleDefinition {
  label: string
  /** Whether the rule compares with a number the person enters. */
  needsValue: boolean
  message(limit: number): string
  /** Only `required` is asked about an empty field; the others accept it. */
  passes(value: unknown, limit: number): boolean
  /** The same check as exported code, over `value`. */
  code(limit: number, helpers: Set<HelperName>): string
}

const optional = (check: string, helpers: Set<HelperName>) => {
  addHelper(helpers, HelperName.IsEmpty)
  return `isEmpty(value) || ${check}`
}

const RULES: Record<RuleType, RuleDefinition> = {
  [RuleType.Required]: {
    label: 'Required',
    needsValue: false,
    message: () => 'This field is required.',
    passes: value => !isBlank(value) && value !== false,
    code: (_, helpers) => {
      addHelper(helpers, HelperName.IsEmpty)
      return '(!isEmpty(value) && value !== false)'
    },
  },
  [RuleType.Email]: {
    label: 'Email address',
    needsValue: false,
    message: () => 'Enter a valid email address.',
    passes: value => EMAIL.test(String(value)),
    code: (_, helpers) => optional(`${EMAIL}.test(value)`, helpers),
  },
  [RuleType.MinLength]: {
    label: 'Minimum length',
    needsValue: true,
    message: limit => `Use at least ${limit} characters.`,
    passes: (value, limit) => lengthOf(value) >= limit,
    code: (limit, helpers) => optional(`value.length >= ${limit}`, helpers),
  },
  [RuleType.MaxLength]: {
    label: 'Maximum length',
    needsValue: true,
    message: limit => `Use at most ${limit} characters.`,
    passes: (value, limit) => lengthOf(value) <= limit,
    code: (limit, helpers) => optional(`value.length <= ${limit}`, helpers),
  },
  [RuleType.Min]: {
    label: 'Smallest number',
    needsValue: true,
    message: limit => `Enter ${limit} or more.`,
    passes: (value, limit) => Number(value) >= limit,
    code: (limit, helpers) => optional(`Number(value) >= ${limit}`, helpers),
  },
  [RuleType.Max]: {
    label: 'Largest number',
    needsValue: true,
    message: limit => `Enter ${limit} or less.`,
    passes: (value, limit) => Number(value) <= limit,
    code: (limit, helpers) => optional(`Number(value) <= ${limit}`, helpers),
  },
}

export const ruleLabel = (type: RuleType) => RULES[type].label
export const ruleNeedsValue = (type: RuleType) => RULES[type].needsValue
export const isRuleType = (value: unknown): value is RuleType => Object.values<unknown>(RuleType).includes(value)

/** Why a rule cannot be applied yet, or null. */
export const ruleError = (rule: ValidationRule): string | null =>
  RULES[rule.type].needsValue && (!rule.value?.trim() || !Number.isFinite(Number(rule.value)))
    ? 'Enter a number.'
    : null

const usable = (rules: ValidationRule[] | undefined) => (rules ?? []).filter(rule => !ruleError(rule))
const messageOf = (rule: ValidationRule) => rule.message?.trim() || RULES[rule.type].message(Number(rule.value))

function failure(rule: ValidationRule, value: unknown): string | null {
  if (rule.type !== RuleType.Required && isBlank(value)) return null
  return RULES[rule.type].passes(value, Number(rule.value)) ? null : messageOf(rule)
}

/** The message of the first rule the value breaks, or null. */
export const checkRules = (rules: ValidationRule[] | undefined, value: unknown): string | null =>
  usable(rules).reduce<string | null>((found, rule) => found ?? failure(rule, value), null)

/** The rules in the form Vuetify's `rules` prop takes. */
export const vuetifyRules = (rules: ValidationRule[] | undefined) =>
  usable(rules).map(rule => (value: unknown) => failure(rule, value) ?? true)

/** The `rules` of exported code, as a JavaScript array, or null when there is none. */
export function rulesToCode(rules: ValidationRule[] | undefined, helpers: Set<HelperName>): string | null {
  const functions = usable(rules).map(
    rule => `value => ${RULES[rule.type].code(Number(rule.value), helpers)} || ${jsString(messageOf(rule))}`,
  )
  return functions.length ? `[${functions.join(', ')}]` : null
}
