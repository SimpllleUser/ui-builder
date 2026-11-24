/** ⌘ on macOS, Ctrl elsewhere. */
export const platformModifierKey = () =>
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl'
