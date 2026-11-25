export interface ProjectMeta {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  /** Grows with every write of the document; missing until the first one. */
  revision?: number
}

/** What is remembered about a project besides its content. */
export interface ProjectPreferences {
  activePageId: string | null
  /** Theme settings as saved text; the theme module reads and checks it. */
  theme: string | null
}

export interface ProjectCheckpoint {
  checkpointId: string
  name: string
  createdAt: number
  snapshot: string
}

export interface NewProject {
  name: string
  /** The serialized document. This entity stores it and never looks inside. */
  document: string
  preferences?: Partial<ProjectPreferences>
  checkpoints?: ProjectCheckpoint[]
}
