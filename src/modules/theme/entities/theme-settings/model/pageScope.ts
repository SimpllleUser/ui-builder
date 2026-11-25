/** Wraps the page being built, so its type and spacing do not restyle the editor around it. */
export const PAGE_SCOPE_CLASS = 'ui-page-style'

/** In an exported app the page is the whole app, including dialogs and menus, which live outside it. */
export const EXPORTED_PAGE_SCOPE = ':is(.v-application, .v-overlay-container)'
