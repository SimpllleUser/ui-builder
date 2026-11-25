import { FieldStyle } from './enums'

const BORDER = 'rgba(var(--v-theme-on-surface), 0.16)'
const TINT = 'rgba(var(--v-theme-on-surface), 0.06)'
const FOCUS_RING = '0 0 0 3px rgba(var(--v-theme-primary), 0.18)'

/**
 * Field looks are style rules rather than `variant` defaults: new fields carry their own `variant`,
 * which would win over a default. The rules cover the outlined and filled variants alike.
 */
export function buildFieldCss(style: FieldStyle, scope: string): string {
  if (style === FieldStyle.Default) return ''
  const filled = style === FieldStyle.Filled
  const outline = `${scope} .v-field .v-field__outline`
  return [
    `${scope} .v-field { background: ${filled ? TINT : 'rgb(var(--v-theme-surface))'}; box-shadow: none; transition: box-shadow 0.15s; }`,
    `${scope} .v-field__overlay, ${scope} .v-field__outline::before, ${scope} .v-field__outline::after { opacity: 0 !important; }`,
    // One border drawn by the field itself replaces Vuetify's three outline pieces and underline.
    `${outline} > * { border-color: transparent !important; }`,
    `${outline} > *::before, ${outline} > *::after { border-color: transparent !important; }`,
    `${scope} .v-field { border: 1px solid ${filled ? 'transparent' : BORDER}; }`,
    `${scope} .v-field--focused { border-color: rgb(var(--v-theme-primary)); box-shadow: ${FOCUS_RING}; }`,
    `${scope} .v-field--error { border-color: rgb(var(--v-theme-error)); }`,
    // The label of an outlined field normally floats onto the border; here it stays inside the box.
    `${scope} .v-field--variant-outlined .v-field__outline__notch .v-field-label--floating { transform: translateY(25%); }`,
    '',
  ].join('\n')
}
