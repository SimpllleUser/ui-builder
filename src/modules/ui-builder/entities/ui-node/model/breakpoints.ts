import { Breakpoint } from './enums'

export type OverrideBreakpoint = Exclude<Breakpoint, Breakpoint.Xs>

/** Every breakpoint, smallest first: each one inherits from those before it. */
export const BREAKPOINTS: readonly Breakpoint[] = [
  Breakpoint.Xs,
  Breakpoint.Sm,
  Breakpoint.Md,
  Breakpoint.Lg,
  Breakpoint.Xl,
]
export const OVERRIDE_BREAKPOINTS = BREAKPOINTS.filter(
  (breakpoint): breakpoint is OverrideBreakpoint => breakpoint !== Breakpoint.Xs,
)

/** The screen width a breakpoint starts at (Vuetify's default thresholds). */
export const BREAKPOINT_MIN_WIDTHS: Record<Breakpoint, number> = {
  [Breakpoint.Xs]: 0,
  [Breakpoint.Sm]: 600,
  [Breakpoint.Md]: 960,
  [Breakpoint.Lg]: 1280,
  [Breakpoint.Xl]: 1920,
}

/** A typical screen of each breakpoint, used to draw the canvas and Preview. */
export const BREAKPOINT_WIDTHS: Record<Breakpoint, number> = {
  [Breakpoint.Xs]: 390,
  [Breakpoint.Sm]: 768,
  [Breakpoint.Md]: 1024,
  [Breakpoint.Lg]: 1280,
  [Breakpoint.Xl]: 1920,
}

/** The breakpoints whose settings apply on `breakpoint`, smallest first. */
export const breakpointsUpTo = (breakpoint: Breakpoint) => BREAKPOINTS.slice(0, BREAKPOINTS.indexOf(breakpoint) + 1)

/**
 * Where the editor writes: null (all sizes) and `xs` are the element's own settings,
 * anything larger is an override of its own.
 */
export const overrideTarget = (breakpoint: Breakpoint | null): OverrideBreakpoint | null =>
  breakpoint === null || breakpoint === Breakpoint.Xs ? null : breakpoint
