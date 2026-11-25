import { SpacingScale } from './enums'

type StyledSpacing = Exclude<SpacingScale, SpacingScale.Default>

interface SpacingTokens {
  /** Inner padding of cards, in pixels like every other value here. */
  card: number
  /** Half of the gap between two grid columns. */
  gutter: number
  container: number
  tableRow: number
  listItem: number
  buttonHeight: number
  buttonPadding: number
}

export const SPACING_TOKENS: Record<StyledSpacing, SpacingTokens> = {
  [SpacingScale.Tight]: {
    card: 14,
    gutter: 6,
    container: 16,
    tableRow: 36,
    listItem: 36,
    buttonHeight: 32,
    buttonPadding: 12,
  },
  [SpacingScale.Balanced]: {
    card: 20,
    gutter: 10,
    container: 32,
    tableRow: 52,
    listItem: 44,
    buttonHeight: 40,
    buttonPadding: 18,
  },
  [SpacingScale.Airy]: {
    card: 28,
    gutter: 16,
    container: 48,
    tableRow: 64,
    listItem: 56,
    buttonHeight: 46,
    buttonPadding: 24,
  },
}

const isStyled = (scale: SpacingScale): scale is StyledSpacing => scale in SPACING_TOKENS

/** Spacing rules for everything inside `scope`. Without `!important`, so a class such as `pa-4` still wins. */
export function buildSpacingCss(scale: SpacingScale, scope: string): string {
  if (!isStyled(scale)) return ''
  const { card, gutter, container, tableRow, listItem, buttonHeight, buttonPadding } = SPACING_TOKENS[scale]
  const half = card / 2
  return [
    `${scope} .v-card-item { padding: ${half}px ${card}px; }`,
    `${scope} .v-card-title { padding: ${half / 2}px ${card}px; }`,
    `${scope} .v-card-text { padding: ${half}px ${card}px; }`,
    `${scope} .v-card-actions { padding: ${half}px ${card}px; gap: ${half}px; }`,
    `${scope} .v-card > :first-child:is(.v-card-item, .v-card-title, .v-card-text) { padding-top: ${card}px; }`,
    `${scope} .v-card > :last-child:is(.v-card-item, .v-card-text) { padding-bottom: ${card}px; }`,
    // A card with its own padding class already insets its content: title and text must not be indented twice.
    `${scope} .v-card[class*='pa-'] > :is(.v-card-item, .v-card-title, .v-card-text) { padding-inline: 0; }`,
    `${scope} .v-container { padding: ${container}px; }`,
    `${scope} .v-row:not(.v-row--dense, .v-row--no-gutters) { margin: -${gutter}px; }`,
    `${scope} .v-row:not(.v-row--dense, .v-row--no-gutters) > [class*='v-col'] { padding: ${gutter}px; }`,
    `${scope} .v-table { --v-table-row-height: ${tableRow}px; --v-table-header-height: ${tableRow}px; }`,
    `${scope} .v-list-item { min-height: ${listItem}px; }`,
    `${scope} .v-btn:not(.v-btn--icon) { --v-btn-height: ${buttonHeight}px; padding-inline: ${buttonPadding}px; }`,
    '',
  ].join('\n')
}
