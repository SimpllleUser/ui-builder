import { cleanStyle, normalizeStyleInput, readStyle, type StyleInput } from '../../../../../shared/lib/inlineStyle'
import { themeColorFromName } from '../../../../../shared/lib/themeColors'
import {
  BREAKPOINTS,
  overrideTarget,
  patchNodeStyle,
  setOverride,
  type Breakpoint,
  type UiNode,
} from '../../../entities/ui-node'

/** The breakpoint an agent named, or null when it named none. Throws for a name Vuetify does not have. */
export function parseBreakpoint(value: unknown): Breakpoint | null {
  if (value === undefined || value === null) return null
  const breakpoint = BREAKPOINTS.find(known => known === value)
  if (!breakpoint) throw new Error(`Unknown breakpoint “${String(value)}”. Use one of: ${BREAKPOINTS.join(', ')}.`)
  return breakpoint
}

/**
 * Applies a style description to an element: lengths as numbers, colours as theme colour names, and every value
 * winning over utility classes (`!important`). `sm`–`xl` change only what differs from that width up; `xs` and no
 * breakpoint change the element's own style. A property set to `null` is removed. A whole style of `null` removes
 * that of the named breakpoint, or, with none named, every style the element has.
 */
export function applyStyleInput(node: UiNode, input: StyleInput | string | null, breakpoint: Breakpoint | null = null) {
  const target = overrideTarget(breakpoint)
  if (input === null) {
    if (target) return setOverride(node, target, {})
    delete node.props.style
    if (!breakpoint) delete node.responsive
    return
  }
  const description = typeof input === 'string' ? (readStyle(input) as StyleInput) : input
  patchNodeStyle(node, target, normalizeStyleInput(description, themeColorFromName))
}

/** The element's style as the person sees it in the Design tab: without the `!important` markers. */
export const plainStyle = (node: UiNode) => cleanStyle(readStyle(node.props.style))

/** What larger screens change, in the same plain form; undefined when nothing does. */
export const plainResponsive = (node: UiNode) =>
  node.responsive &&
  Object.fromEntries(Object.entries(node.responsive).map(([name, style]) => [name, cleanStyle(style)]))
