export const ROOT_NODE_ID = 'root-canvas'
export const TEXT_NODE_TYPE = 'TEXT'
export const OUTLET_NODE_TYPE = 'PageOutlet'
export const DATA_TABLE_TYPE = 'VDataTable'
export const IMAGE_TYPE = 'VImg'
export const DIALOG_TYPE = 'VDialog'
export const MENU_TYPE = 'VMenu'
export const SNACKBAR_TYPE = 'VSnackbar'
export const TOOLTIP_TYPE = 'VTooltip'

export const DOCUMENT_VERSION = 2
export const MAX_DOCUMENT_NODES = 5_000
export const MAX_DOCUMENT_DEPTH = 60
export const MAX_PAGES = 50
export const MAX_HISTORY_ENTRIES = 50
export const MAX_CHECKPOINTS = 30
export const MAX_RECENT_COMPONENTS = 6
export const HISTORY_COMMIT_DELAY_MS = 600
/** Joins an instance's id and an original element's id into the id of that element inside the instance. */
export const INSTANCE_ID_SEPARATOR = '--'
/** Deleted saved components kept for restoring; the oldest ones go first. */
export const MAX_DELETED_PREFABS = 10
