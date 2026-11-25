import { CardStyle } from './enums'

/** Vuetify draws an outlined card's border in the text colour, which is far too strong for a thin frame. */
export const buildCardCss = (style: CardStyle, scope: string) =>
  style === CardStyle.Outlined
    ? `${scope} .v-card--variant-outlined { border-color: rgba(var(--v-theme-on-surface), 0.12); }\n`
    : ''
