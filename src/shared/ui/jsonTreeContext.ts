import type { InjectionKey } from 'vue'
import type { JsonKind, JsonPath } from '../lib/jsonTree'

/** What the rows of a JSON tree ask their editor to do, so the rows need no events passed through every level. */
export interface JsonTreeContext {
  change(path: JsonPath, value: unknown): void
  remove(path: JsonPath): void
  add(path: JsonPath, key: string, kind: JsonKind): void
}

export const JSON_TREE_CONTEXT: InjectionKey<JsonTreeContext> = Symbol('json-tree-context')
