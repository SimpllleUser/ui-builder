import type { StyleMap } from '../../../../../shared/lib/inlineStyle'
import type { ActionType, Breakpoint, EventName, RuleType } from './enums'

/** What a larger screen changes in the element's style; everything else is inherited. `xs` is the style itself. */
export type ResponsiveStyles = Partial<Record<Exclude<Breakpoint, Breakpoint.Xs>, StyleMap>>

/** One thing an event does in preview. Written values are parsed as JSON, falling back to text. */
export type UiAction =
  | { type: ActionType.Navigate; to: string }
  | { type: ActionType.Set; key: string; value: string }
  | { type: ActionType.Toggle; key: string }
  /** Adds a value to the end of a list. */
  | { type: ActionType.Append; key: string; value: string }
  /** Removes the first entry of a list that equals the value. */
  | { type: ActionType.Remove; key: string; value: string }
  | { type: ActionType.Notify; message: string }
  /** Puts the variables of the surrounding form back to their starting values. */
  | { type: ActionType.ResetForm }

/** The actions of one event: one alone is stored as it is, several as a list that runs in order. */
export type EventActions = UiAction | UiAction[]

export type UiNodeEvents = Partial<Record<EventName, EventActions>>

export interface ValidationRule {
  type: RuleType
  /** The length or number the rule compares with, for the rules that need one. */
  value?: string
  /** Shown under the field instead of the usual message. */
  message?: string
}

/** A mock REST endpoint a list is loaded from. Its answer is the variable's starting value. */
export interface DataSource {
  url: string
  /** How long Preview pretends the request takes. */
  delayMs: number
  /** A variable that is true while the data is on its way. */
  loadingVariable?: string
}

/** What ties an element to the saved component it was inserted from. */
export interface InstanceLink {
  prefabId: string
  /** Parameter values chosen for this instance; the ones left out follow the component's defaults. */
  values: Record<string, string>
  /** What the instance held when it was last built from the original, to notice edits made while that was gone. */
  stamp?: string
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
  /** Condition for rendering in preview, an expression such as `key`, `!key`, `step >= 2 and role == "admin"` (see expression.ts). */
  vIf?: string
  /** State key holding an array (or a number) to repeat this element for; exposes `item` and `index`. */
  vFor?: string
  events?: UiNodeEvents
  responsive?: ResponsiveStyles
  /** Checks of a form field. */
  rules?: ValidationRule[]
  /** Set on the root of a component instance. */
  instance?: InstanceLink
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
  /** Variables worked out from others: name to expression. */
  computed?: Record<string, string>
  /** Variables of `state` that are loaded from an endpoint. */
  sources?: Record<string, DataSource>
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

/** A saved component that was deleted and can still be brought back. */
export interface DeletedPrefab {
  prefab: Prefab
  /** Where it stood in the list. */
  index: number
  deletedAt: number
}

export interface HistoryCheckpoint {
  checkpointId: string
  name: string
  createdAt: number
  snapshot: string
}
