export type ComponentType =
  | 'VBtn' | 'VTextField' | 'VCard' | 'VCardTitle' | 'VCardText'
  | 'VList' | 'VListItem' | 'VRow' | 'VCol' | 'div' | 'VIcon' | 'VImg'

export interface UiNode {
  id: string
  type: ComponentType | string
  name: string
  props: Record<string, unknown>
  classes: string[]
  children: UiNode[]
  slots: Record<string, UiNode[]>
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
