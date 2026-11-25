import { Breakpoint, BREAKPOINT_WIDTHS, BREAKPOINTS } from '../../../entities/ui-node'

const DEVICE_NAMES: Record<Breakpoint, string> = {
  [Breakpoint.Xs]: 'Mobile',
  [Breakpoint.Sm]: 'Tablet',
  [Breakpoint.Md]: 'Laptop',
  [Breakpoint.Lg]: 'Desktop',
  [Breakpoint.Xl]: 'Wide',
}

/** The screens Preview can imitate, one per Vuetify breakpoint, widest first. */
export const PREVIEW_DEVICES = [...BREAKPOINTS].reverse().map(breakpoint => ({
  title: `${DEVICE_NAMES[breakpoint]} · ${BREAKPOINT_WIDTHS[breakpoint]}`,
  value: BREAKPOINT_WIDTHS[breakpoint],
}))
