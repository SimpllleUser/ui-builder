/**
 * Everything that depends on the kind of a click action. A new `ActionType` does not compile until it has a handler,
 * so none of Preview, export, the audit, the validator or the editor can silently skip it.
 */
import { ActionType, IssueKind } from './enums'
import { addHelper, HelperName } from './expressionToJs'
import { jsLiteral } from './jsLiteral'
import { interpolate, parseLiteral, type Scope } from './runtime'
import type { UiAction } from './types'
import { bindText, textToJsExpression } from './vueBindings'

type ActionOf<K extends ActionType> = Extract<UiAction, { type: K }>

/** An action whose `{{ }}` values were filled in. A `set` value that was a single binding keeps its type (e.g. a whole row). */
export type BoundAction =
  Exclude<UiAction, { type: ActionType.Set }> | { type: ActionType.Set; key: string; value: unknown }
type BoundActionOf<K extends ActionType> = Extract<BoundAction, { type: K }>

export interface RuntimeHost {
  state: Record<string, unknown>
  navigate: (path: string) => void
}

/** What exported code needs besides the statement itself. */
export interface CodeContext {
  helpers: Set<HelperName>
  usage: { router: boolean }
}

/** A click action as an agent or a file describes it, before it is known to be valid. */
export interface ActionInput {
  type?: unknown
  to?: unknown
  key?: unknown
  value?: unknown
}

/** Starting values offered when a person picks a kind of action. */
export interface ActionDefaults {
  path: string
  variable: string
}

/** Method syntax on purpose: it lets a handler of one kind be called through the shared, wider type. */
interface ActionHandler<A extends UiAction, B extends BoundAction> {
  /** The name shown in the editor. */
  label: string
  /** The shape an agent is told to use. */
  example: string
  create(defaults: ActionDefaults): A
  /** The value a variable created for this action starts with. */
  newVariableValue: unknown
  /** Whether a stored action is complete. */
  isValid(input: ActionInput): boolean
  /** The action an agent asked for, or null when something is missing. */
  fromInput(input: ActionInput): A | null
  /** The variable the action writes, and the text whose `{{ }}` values it reads. */
  references(action: A): { variable?: string; text?: string }
  /** Why the action would not work among these routes, or null. */
  problem(action: A, routes: ReadonlySet<string>): { kind: IssueKind; predicate: string } | null
  describe(action: A): string
  bind(action: A, scope: Scope): B
  run(action: B, host: RuntimeHost): void
  toCode(action: A, context: CodeContext): string
}

const SINGLE_BINDING = /^\s*\{\{[^{}]+\}\}\s*$/

const missingVariable = (key: string) =>
  key.trim()
    ? null
    : { kind: IssueKind.MissingVariable, predicate: 'has a click action with no variable chosen, so it does nothing.' }

const ACTION_HANDLERS: { [K in ActionType]: ActionHandler<ActionOf<K>, BoundActionOf<K>> } = {
  [ActionType.Navigate]: {
    label: 'Go to page',
    example: '{ type: "navigate", to }',
    create: ({ path }) => ({ type: ActionType.Navigate, to: path }),
    newVariableValue: '',
    isValid: ({ to }) => typeof to === 'string',
    fromInput: ({ to }) => (typeof to === 'string' ? { type: ActionType.Navigate, to } : null),
    references: ({ to }) => ({ text: to }),
    problem: ({ to }, routes) =>
      to.includes('{{') || routes.has(to)
        ? null
        : { kind: IssueKind.MissingRoute, predicate: `goes to “${to}”, but no page has that route.` },
    describe: ({ to }) => `go to ${to || 'a page'}`,
    bind: (action, scope) => ({ ...action, to: String(interpolate(action.to, scope) ?? '') }),
    run: ({ to }, host) => host.navigate(to),
    toCode: ({ to }, context) => {
      context.usage.router = true
      return `router.push(${textToJsExpression(to)})`
    },
  },
  [ActionType.Set]: {
    label: 'Set a variable',
    example: '{ type: "set", key, value }',
    create: ({ variable }) => ({ type: ActionType.Set, key: variable, value: 'true' }),
    newVariableValue: '',
    isValid: ({ key, value }) => typeof key === 'string' && typeof value === 'string',
    fromInput: ({ key, value }) =>
      typeof key === 'string' ? { type: ActionType.Set, key, value: String(value ?? '') } : null,
    references: ({ key, value }) => ({ variable: key, text: value }),
    problem: ({ key }) => missingVariable(key),
    describe: ({ key, value }) => `set ${key || 'a variable'} to ${value}`,
    bind: (action, scope) => {
      const value = interpolate(action.value, scope)
      // Copy objects so the saved selection does not change with the table it came from.
      return {
        ...action,
        value: value !== null && typeof value === 'object' ? JSON.parse(JSON.stringify(value)) : value,
      }
    },
    run: ({ key, value }, host) => {
      if (key) host.state[key] = typeof value === 'string' ? parseLiteral(value) : value
    },
    toCode: ({ key, value }, context) => {
      const bound = bindText(value)
      if (!bound.dynamic) return `${key} = ${jsLiteral(parseLiteral(value))}`
      // A single value keeps its type and is copied, like Preview stores a table row.
      if (SINGLE_BINDING.test(value)) {
        addHelper(context.helpers, HelperName.CopyOf)
        return `${key} = copyOf(${bound.code})`
      }
      return `${key} = ${bound.code}`
    },
  },
  [ActionType.Toggle]: {
    label: 'Switch a variable on/off',
    example: '{ type: "toggle", key }',
    create: ({ variable }) => ({ type: ActionType.Toggle, key: variable }),
    newVariableValue: false,
    isValid: ({ key }) => typeof key === 'string',
    fromInput: ({ key }) => (typeof key === 'string' ? { type: ActionType.Toggle, key } : null),
    references: ({ key }) => ({ variable: key }),
    problem: ({ key }) => missingVariable(key),
    describe: ({ key }) => `switch ${key || 'a variable'} on or off`,
    bind: action => action,
    run: ({ key }, host) => {
      if (key) host.state[key] = !host.state[key]
    },
    toCode: ({ key }) => `${key} = !${key}`,
  },
}

export const isActionType = (value: unknown): value is ActionType => Object.values<unknown>(ActionType).includes(value)

// The handler is picked by the action's own type, so it always receives the kind of action it is written for.
const handlerOf = (type: ActionType): ActionHandler<UiAction, BoundAction> => ACTION_HANDLERS[type]

export const actionLabel = (type: ActionType) => handlerOf(type).label
export const createAction = (type: ActionType, defaults: ActionDefaults): UiAction => handlerOf(type).create(defaults)
export const newVariableValue = (type: ActionType) => handlerOf(type).newVariableValue

export const isValidAction = (input: ActionInput) => isActionType(input.type) && handlerOf(input.type).isValid(input)

export const actionExamples = () => Object.values(ActionType).map(type => handlerOf(type).example)
export const actionFromInput = (input: ActionInput): UiAction | null =>
  isActionType(input.type) ? handlerOf(input.type).fromInput(input) : null

export const actionReferences = (action: UiAction) => handlerOf(action.type).references(action)
export const actionProblem = (action: UiAction, routes: ReadonlySet<string>) =>
  handlerOf(action.type).problem(action, routes)
/** Whether the action still has no variable to write; it does nothing then, and there is no code to export for it. */
export const lacksVariable = (action: UiAction) => {
  const { variable } = actionReferences(action)
  return variable !== undefined && !variable.trim()
}
export const describeAction = (action: UiAction) => handlerOf(action.type).describe(action)
export const actionToCode = (action: UiAction, context: CodeContext) => handlerOf(action.type).toCode(action, context)

/** Fills `{{ item.id }}`-style values of an action from the scope it was triggered in (e.g. a table row). */
export const bindAction = (action: UiAction, scope: Scope): BoundAction => handlerOf(action.type).bind(action, scope)

export function runAction(action: UiAction | BoundAction | undefined, host: RuntimeHost) {
  if (action) handlerOf(action.type).run(action, host)
}
