export const DATABASE_NAME = 'ui-builder'
export const DATABASE_VERSION = 1

export enum StoreName {
  Projects = 'projects',
  Documents = 'documents',
  Preferences = 'preferences',
  Checkpoints = 'checkpoints',
  /** One-off facts about the database itself. */
  Meta = 'meta',
}

export const CHECKPOINTS_BY_PROJECT = 'by-project'
export const LEGACY_IMPORTED_KEY = 'legacy-imported'

/** Where the single project lived before there were several. */
export enum LegacyStorageKey {
  Document = 'ui-builder:document:v1',
  Checkpoints = 'ui-builder:history-checkpoints',
  ActivePage = 'ui-builder:active-page',
  Theme = 'ui-builder-theme-settings',
}
