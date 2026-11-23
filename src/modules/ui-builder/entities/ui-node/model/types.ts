import type { ActionType } from './enums'

/** What happens when an element is clicked in preview. `set` values are parsed as JSON, falling back to text. */
export type UiAction =
  | { type: ActionType.Navigate; to: string }
  | { type: ActionType.Set; key: string; value: string }
  | { type: ActionType.Toggle; key: string }

export interface UiNodeEvents {
  click?: UiAction
}

export interface UiNode {
  id: string
  /** The component's name, such as `VBtn`, `VCard` or `div`. */
  type: string
  name: string
  props: Record<string, unknown>
  classes: string[]
  children: UiNode[]
  slots: Record<string, UiNode[]>
  /** State key bound to the component's v-model. */
  model?: string
  /** Condition for rendering in preview: `key`, `!key`, `key == value`, `key != value`. */
  vIf?: string
  /** State key holding an array (or a number) to repeat this element for; exposes `item` and `index`. */
  vFor?: string
  events?: UiNodeEvents
}

export interface Page {
  id: string
  name: string
  path: string
  root: UiNode
}

export interface Project {
  pages: Page[]
  /** Shared layout. Its `PageOutlet` element is replaced by the current page in preview. */
  layout: UiNode | null
  /** Initial values of the state variables used by bindings and events. */
  state: Record<string, unknown>
}

/** A parameter of a saved component: `{{props.<name>}}` inside it is replaced when the component is inserted. */
export interface PrefabProp {
  name: string
  defaultValue: string
}

export interface Prefab {
  prefabId: string
  name: string
  node: UiNode
  /** Saved before parameters existed when missing. */
  props?: PrefabProp[]
}

export interface HistoryCheckpoint {
  checkpointId: string
  name: string
  createdAt: number
  snapshot: string
}
