import { BREAKPOINT_MIN_WIDTHS, BREAKPOINTS, breakpointsUpTo } from './breakpoints'
import { Breakpoint } from './enums'

export const GRID_COLUMN_TYPE = 'VCol'
export const GRID_COLUMNS = 12

/** The `VCol` prop that sets the width from each breakpoint up. */
export const COLUMN_PROPS: Record<Breakpoint, string> = {
  [Breakpoint.Xs]: 'cols',
  [Breakpoint.Sm]: 'sm',
  [Breakpoint.Md]: 'md',
  [Breakpoint.Lg]: 'lg',
  [Breakpoint.Xl]: 'xl',
}

/** `offset`, `offsetSm`… and `order`, `orderSm`… */
const prefixedProps = (prefix: string) => (breakpoint: Breakpoint) =>
  breakpoint === Breakpoint.Xs ? prefix : `${prefix}${breakpoint[0].toUpperCase()}${breakpoint.slice(1)}`

const GRID_PROP_NAMES = [
  (breakpoint: Breakpoint) => COLUMN_PROPS[breakpoint],
  prefixedProps('offset'),
  prefixedProps('order'),
]

const isSet = (value: unknown) => value !== undefined && value !== null && value !== ''

/**
 * The grid props of a `VCol` as they act on `breakpoint`, written as the base props. Vuetify decides by the window's
 * width, so a canvas narrower than the window needs this to show the columns of the screen it stands for.
 */
export function gridPropsAt(props: Record<string, unknown>, breakpoint: Breakpoint): Record<string, unknown> {
  const shown = { ...props }
  for (const nameOf of GRID_PROP_NAMES) {
    const value = breakpointsUpTo(breakpoint)
      .map(current => props[nameOf(current)])
      .filter(isSet)
      .at(-1)
    for (const current of BREAKPOINTS) delete shown[nameOf(current)]
    if (value !== undefined) shown[nameOf(Breakpoint.Xs)] = value
  }
  return shown
}

/**
 * The prop a change of width goes to: the one of the breakpoint being edited, or, when all sizes are edited,
 * the one that is in effect on a window of `windowWidth`, so the change can be seen.
 */
export function columnPropFor(props: Record<string, unknown>, editing: Breakpoint | null, windowWidth: number): string {
  if (editing) return COLUMN_PROPS[editing]
  const inEffect = BREAKPOINTS.filter(
    breakpoint => BREAKPOINT_MIN_WIDTHS[breakpoint] <= windowWidth && isSet(props[COLUMN_PROPS[breakpoint]]),
  ).at(-1)
  return COLUMN_PROPS[inEffect ?? Breakpoint.Xs]
}

/** How many of the twelve columns come closest to `width` pixels of a row. */
export const columnsForWidth = (width: number, rowWidth: number) =>
  rowWidth > 0 ? Math.min(GRID_COLUMNS, Math.max(1, Math.round((width / rowWidth) * GRID_COLUMNS))) : GRID_COLUMNS
