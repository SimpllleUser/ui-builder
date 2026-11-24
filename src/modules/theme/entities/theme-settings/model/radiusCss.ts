/** Components whose corners follow the chosen radius. Round icon buttons and pills keep their shape. */
const ROUNDED_SELECTORS = [
  '.v-btn:not(.v-btn--icon):not(.v-btn--rounded)',
  '.v-card',
  '.v-field',
  '.v-alert',
  '.v-menu > .v-overlay__content',
]

/** The style rules that apply a corner radius to every component above, or nothing when there is no radius. */
export const buildRadiusCss = (radius: number | null) =>
  radius === null ? '' : `${ROUNDED_SELECTORS.join(',\n')} {\n  border-radius: ${radius}px;\n}\n`
