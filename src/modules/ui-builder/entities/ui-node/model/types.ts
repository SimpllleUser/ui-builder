export type ComponentType =
  | 'VBtn'
  | 'VTextField'
  | 'VCard'
  | 'VCardTitle'
  | 'VCardText'
  | 'VList'
  | 'VListItem'
  | 'VRow'
  | 'VCol'
  | 'div'
  | 'VIcon'
  | 'VImg'

/** What happens when an element is clicked in preview. `set` values are parsed as JSON, falling back to text. */
export type UiAction =
  { type: 'navigate'; to: string } | { type: 'set'; key: string; value: string } | { type: 'toggle'; key: string }

export interface UiNodeEvents {
  click?: UiAction
}

export interface UiNode {
  id: string
  type: ComponentType | string
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

export interface Prefab {
  prefabId: string
  name: string
  node: UiNode
}

export interface HistoryCheckpoint {
  checkpointId: string
  name: string
  createdAt: number
  snapshot: string
}
