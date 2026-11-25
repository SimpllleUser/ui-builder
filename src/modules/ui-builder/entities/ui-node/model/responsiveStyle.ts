import { cleanStyle, markImportant, readStyle, withStyle, type StyleMap } from '../../../../../shared/lib/inlineStyle'
import { hashText } from '../../../../../shared/lib/hashText'
import { BREAKPOINT_MIN_WIDTHS, breakpointsUpTo, OVERRIDE_BREAKPOINTS, overrideTarget } from './breakpoints'
import type { Breakpoint } from './enums'
import { walkNodes } from './treeUtils'
import type { UiNode } from './types'

const CLASS_PREFIX = 'ui-r-'
const PROPERTY_NAME = /^[a-zA-Z]+$/
/** Characters that could end the rule and start another one, or a binding that only the element itself can fill in. */
const UNSAFE_CSS_VALUE = /[;{}<]|\/\*/

export const isCssDeclaration = (name: string, value: unknown): boolean =>
  PROPERTY_NAME.test(name) && typeof value === 'string' && !UNSAFE_CSS_VALUE.test(value)

/** `override` on top of `base`, with the overridden properties moved last so they also win over shorthands. */
function overlay(base: StyleMap, override: StyleMap): StyleMap {
  const merged = { ...base }
  for (const [name, value] of Object.entries(override)) {
    delete merged[name]
    merged[name] = value
  }
  return merged
}

/** The style an element has on a screen: its own style plus every override up to that breakpoint. */
export function effectiveStyle(node: UiNode, breakpoint: Breakpoint | null): StyleMap {
  const own = readStyle(node.props.style)
  if (!breakpoint) return own
  return breakpointsUpTo(breakpoint).reduce(
    (style, current) => overlay(style, node.responsive?.[overrideTarget(current)!] ?? {}),
    own,
  )
}

export const hasOverrides = (node: UiNode, breakpoint?: Breakpoint): boolean =>
  OVERRIDE_BREAKPOINTS.some(
    current => (!breakpoint || breakpoint === current) && Object.keys(node.responsive?.[current] ?? {}).length > 0,
  )

/**
 * Changes style properties on the breakpoint being edited; `null` removes a property there, so it is inherited again.
 * Values are given plain and saved `!important`, which wins over Vuetify's utility classes.
 */
export function patchNodeStyle(node: UiNode, breakpoint: Breakpoint | null, patch: Record<string, string | null>) {
  const important = Object.fromEntries(
    Object.entries(patch).map(([name, value]) => [name, value && markImportant(value)]),
  )
  const target = overrideTarget(breakpoint)
  if (target) {
    setOverride(node, target, withStyle(node.responsive?.[target] ?? {}, important))
    return
  }
  const next = withStyle(readStyle(node.props.style), important)
  if (Object.keys(next).length) node.props.style = next
  else delete node.props.style
}

/** Replaces what one larger screen changes; an empty style removes the override altogether. */
export function setOverride(node: UiNode, breakpoint: Breakpoint, style: StyleMap) {
  const target = overrideTarget(breakpoint)
  if (!target) return
  const next = { ...node.responsive }
  if (Object.keys(style).length) next[target] = style
  else delete next[target]
  if (Object.keys(next).length) node.responsive = next
  else delete node.responsive
}

const kebabCase = (name: string) => name.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)

const declarations = (style: StyleMap) =>
  Object.entries(cleanStyle(style))
    .filter(([name, value]) => isCssDeclaration(name, value))
    .map(([name, value]) => `${kebabCase(name)}: ${markImportant(value)};`)

export interface ResponsiveRules {
  /** Class that puts the rules on the element; elements with the same rules share it. */
  className: string
  css: string
  /** Base properties that stay inline, because only the element can fill in their `{{ }}` bindings. */
  inlineStyle: StyleMap
}

/**
 * The style of an element with overrides as stylesheet rules. The base style has to be a rule as well: an inline
 * `!important` value would beat every media query. Null when the element has no overrides.
 */
export function responsiveRules(node: UiNode): ResponsiveRules | null {
  if (!hasOverrides(node)) return null
  const base = readStyle(node.props.style)
  const blocks = [
    { minWidth: null, lines: declarations(base) },
    ...OVERRIDE_BREAKPOINTS.map(breakpoint => ({
      minWidth: BREAKPOINT_MIN_WIDTHS[breakpoint],
      lines: declarations(node.responsive?.[breakpoint] ?? {}),
    })),
  ].filter(block => block.lines.length)
  const className = `${CLASS_PREFIX}${hashText(JSON.stringify(blocks))}`
  // The class is repeated so the rule is more specific than a single utility class.
  const selector = `.${className}.${className}`
  const rule = (lines: string[], pad: string) =>
    [`${pad}${selector} {`, ...lines.map(line => `${pad}  ${line}`), `${pad}}`].join('\n')
  const css = blocks
    .map(({ minWidth, lines }) =>
      minWidth ? `@media (min-width: ${minWidth}px) {\n${rule(lines, '  ')}\n}` : rule(lines, ''),
    )
    .join('\n')
  const inlineStyle = Object.fromEntries(Object.entries(base).filter(([, value]) => value.includes('{{')))
  return { className, css, inlineStyle }
}

/** The stylesheet that every element with overrides in these trees needs. */
export function responsiveStylesheet(roots: UiNode[]): string {
  const rules = roots.flatMap(root => [...walkNodes(root)].flatMap(node => responsiveRules(node)?.css ?? []))
  return [...new Set(rules)].join('\n')
}
