/** Reads parameter definitions given by an agent, which may be anything. */
import { PrefabPropType, prefabPropErrors, prefabPropNameError, type PrefabProp } from '../../../entities/ui-node'
const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isType = (value: unknown): value is PrefabPropType => Object.values<unknown>(PrefabPropType).includes(value)

const isTextList = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every(item => typeof item === 'string')

function numberField(input: Record<string, unknown>, field: string): number | undefined {
  const value = input[field]
  if (value === undefined) return undefined
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`${field} must be a number.`)
  return value
}

/**
 * A checked definition. `isNew` also checks the name; the name of a parameter the component already has comes from
 * its placeholders. Throws with the reason.
 */
export function parameterFromInput(input: unknown, isNew: (name: string) => boolean): PrefabProp {
  if (!isObject(input)) throw new Error('A parameter is an object such as { name: "size", type: "number" }.')
  const name = String(input.name ?? '')
  if (!name) throw new Error('A parameter needs a name.')
  const type = input.type ?? PrefabPropType.Text
  if (!isType(type)) throw new Error(`Parameter “${name}”: type is one of ${Object.values(PrefabPropType).join(', ')}.`)
  const { options } = input
  if (options !== undefined && !isTextList(options)) throw new Error(`Parameter “${name}”: options is a list of texts.`)
  const limits = {
    ...(type === PrefabPropType.Number ? { min: numberField(input, 'min'), max: numberField(input, 'max') } : {}),
    ...(type === PrefabPropType.Text ? { maxLength: numberField(input, 'maxLength') } : {}),
    ...(type === PrefabPropType.Choice ? { options } : {}),
  }
  const parameter: PrefabProp = {
    name,
    type,
    defaultValue: String(input.defaultValue ?? ''),
    ...(input.required === true ? { required: true } : {}),
    ...Object.fromEntries(Object.entries(limits).filter(([, value]) => value !== undefined)),
  }
  const error = (isNew(name) ? prefabPropNameError(name, []) : null) ?? Object.values(prefabPropErrors(parameter))[0]
  if (error) throw new Error(`Parameter “${name}”: ${error}`)
  return parameter
}
