/** What a JSON value is, so a tree can pick the right editor for it. */
export enum JsonKind {
  String = 'string',
  Number = 'number',
  Boolean = 'boolean',
  Null = 'null',
  Array = 'array',
  Object = 'object',
}

/** Where a value is inside a document: the keys of objects and the indexes (as text) of arrays, from the top. */
export type JsonPath = string[]

export interface JsonEntry {
  key: string
  value: unknown
}

export const isJsonRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

export function jsonKind(value: unknown): JsonKind {
  if (Array.isArray(value)) return JsonKind.Array
  if (isJsonRecord(value)) return JsonKind.Object
  if (typeof value === 'string') return JsonKind.String
  if (typeof value === 'number') return JsonKind.Number
  if (typeof value === 'boolean') return JsonKind.Boolean
  return JsonKind.Null
}

export const isJsonContainer = (value: unknown): boolean => {
  const kind = jsonKind(value)
  return kind === JsonKind.Array || kind === JsonKind.Object
}

/** The starting value of a new item of the given kind. */
export function emptyJsonValue(kind: JsonKind): unknown {
  const empty: Record<JsonKind, unknown> = {
    [JsonKind.String]: '',
    [JsonKind.Number]: 0,
    [JsonKind.Boolean]: false,
    [JsonKind.Null]: null,
    [JsonKind.Array]: [],
    [JsonKind.Object]: {},
  }
  return empty[kind]
}

/** The items inside an object or an array, in order. Arrays use their indexes as keys. */
export function jsonEntries(value: unknown): JsonEntry[] {
  if (Array.isArray(value)) return value.map((item, index) => ({ key: String(index), value: item }))
  if (isJsonRecord(value)) return Object.entries(value).map(([key, item]) => ({ key, value: item }))
  return []
}

/** A copy of the document where the value at `path` was changed by `change`; everything else is shared, not copied. */
function updateAt(root: unknown, path: JsonPath, change: (target: unknown) => unknown): unknown {
  if (!path.length) return change(root)
  const [head, ...rest] = path
  if (Array.isArray(root))
    return root.map((item, index) => (String(index) === head ? updateAt(item, rest, change) : item))
  if (isJsonRecord(root)) return { ...root, [head]: updateAt(root[head], rest, change) }
  return root
}

export const setAtPath = (root: unknown, path: JsonPath, value: unknown): unknown => updateAt(root, path, () => value)

export function removeAtPath(root: unknown, path: JsonPath): unknown {
  if (!path.length) return root
  const removedKey = path[path.length - 1]
  return updateAt(root, path.slice(0, -1), parent => {
    if (Array.isArray(parent)) return parent.filter((_, index) => String(index) !== removedKey)
    if (isJsonRecord(parent)) return Object.fromEntries(Object.entries(parent).filter(([key]) => key !== removedKey))
    return parent
  })
}

/** Adds an item to the array or object at `path`. Arrays take it at the end and ignore the key. */
export function addChildAtPath(root: unknown, path: JsonPath, key: string, value: unknown): unknown {
  return updateAt(root, path, parent => {
    if (Array.isArray(parent)) return [...parent, value]
    if (isJsonRecord(parent)) return { ...parent, [key]: value }
    return parent
  })
}

/** Why `key` cannot be added to the object `parent`, or null when it can (arrays need no key). */
export function jsonKeyError(parent: unknown, key: string): string | null {
  if (!isJsonRecord(parent)) return null
  if (!key.trim()) return 'Write a name.'
  if (key in parent) return `“${key}” already exists.`
  return null
}
