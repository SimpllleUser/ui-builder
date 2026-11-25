/** The text of the input an event came from. */
// Open menus and dialogs, but not messages and tooltips: those should not swallow keys.
const OPEN_OVERLAY = '.v-overlay--active:not(.v-snackbar):not(.v-tooltip)'
const TEXT_FIELD = 'input, textarea, select, [contenteditable="true"], [role="textbox"]'

export const hasOpenOverlay = () => !!document.querySelector(OPEN_OVERLAY)

/** Whether an event comes from a place where keys and the clipboard work on text. */
export const isInTextField = (target: EventTarget | null) => target instanceof Element && !!target.closest(TEXT_FIELD)

/** The text of the input an event came from. */
export const inputValue = (event: Event) => (event.target as HTMLInputElement).value
