/**
 * Which Vuetify utility classes of an element have no effect, because its own style or a shared class sets the same
 * CSS property. Only the utilities that overlap with what a style can set are listed here.
 */
import type { StyleMap } from '../../../../../shared/lib/inlineStyle'

export enum StyleSource {
  Element = 'element',
  SharedClass = 'shared-class',
}

export interface OverriddenUtility {
  className: string
  /** CSS properties of the utility that something stronger sets, such as `padding-top`. */
  properties: string[]
  sources: StyleSource[]
}

const SIDES = ['top', 'right', 'bottom', 'left']
const CORNERS = ['top-left', 'top-right', 'bottom-right', 'bottom-left']
const sidesOf = (box: string, sides = SIDES) => sides.map(side => `${box}-${side}`)
const radius = (corners = CORNERS) => corners.map(corner => `border-${corner}-radius`)
const TYPOGRAPHY = ['font-size', 'font-weight', 'line-height', 'letter-spacing']
const BORDER = ['border-width', 'border-style', 'border-color'].flatMap(name =>
  SIDES.map(side => name.replace('-', `-${side}-`)),
)

/** `s` and `e` are start and end, which are left and right in left-to-right text. */
const SPACING_SIDES: Record<string, string[]> = {
  a: SIDES,
  x: ['left', 'right'],
  y: ['top', 'bottom'],
  t: ['top'],
  r: ['right'],
  b: ['bottom'],
  l: ['left'],
  s: ['left'],
  e: ['right'],
}

/** Utility class, without its breakpoint → the CSS properties it sets. The first match counts. */
const UTILITIES: [RegExp, (match: RegExpExecArray) => string[]][] = [
  [
    /^([pm])([axytrblse])-(n?\d+|auto)$/,
    ([, box, side]) => sidesOf(box === 'p' ? 'padding' : 'margin', SPACING_SIDES[side]),
  ],
  [/^ga-/, () => ['row-gap', 'column-gap']],
  [/^rounded(-(0|sm|lg|xl|pill|circle|shaped))?$/, () => radius()],
  [/^text-(h[1-6]|subtitle-[12]|body-[12]|button|caption|overline)$/, () => TYPOGRAPHY],
  [/^text-(left|right|center|justify|start|end)$/, () => ['text-align']],
  [/^text-(no-wrap|wrap|pre.*|truncate|break|uppercase|lowercase|capitalize|none|decoration-.+)$/, () => []],
  [/^text-/, () => ['color']],
  [/^bg-/, () => ['background-color', 'color']],
  [/^font-weight-/, () => ['font-weight']],
  [/^d-/, () => ['display']],
  [/^flex-(row|column)(-reverse)?$/, () => ['flex-direction']],
  [/^flex-(wrap|nowrap|wrap-reverse)$/, () => ['flex-wrap']],
  [/^justify-(start|end|center|space-\w+)$/, () => ['justify-content']],
  [/^align-(start|end|center|baseline|stretch)$/, () => ['align-items']],
  [/^w-/, () => ['width']],
  [/^h-/, () => ['height']],
  [/^elevation-/, () => ['box-shadow']],
  [/^opacity-/, () => ['opacity']],
  [/^border(-(sm|md|lg|xl|thin))?$/, () => BORDER],
]

const BREAKPOINT_INFIX = /-(sm|md|lg|xl|xxl)(?=-)/

/** `text-md-h4` → `text-h4`; `rounded-lg` and `border-md` are sizes, not breakpoints, and stay. */
const withoutBreakpoint = (className: string) =>
  /^(rounded|border)-/.test(className) ? className : className.replace(BREAKPOINT_INFIX, '')

function utilityProperties(className: string): string[] {
  const name = withoutBreakpoint(className)
  for (const [pattern, properties] of UTILITIES) {
    const match = pattern.exec(name)
    if (match) return properties(match)
  }
  return []
}

const kebabCase = (name: string) => name.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)

/** A style property as the single properties it sets, so `padding` meets `pt-2` and `paddingTop` meets `pa-4`. */
function longhands(property: string): string[] {
  const name = kebabCase(property)
  if (name === 'padding' || name === 'margin') return sidesOf(name)
  if (name === 'gap') return ['row-gap', 'column-gap']
  if (name === 'border-radius') return radius()
  if (name === 'background') return ['background-color']
  if (name === 'border') return BORDER
  const edge = /^border-(width|style|color)$/.exec(name)
  if (edge) return SIDES.map(side => `border-${side}-${edge[1]}`)
  return [name]
}

export function overriddenUtilities(
  classNames: string[],
  ownStyle: StyleMap,
  sharedStyle: StyleMap,
): OverriddenUtility[] {
  const sources = [
    { source: StyleSource.Element, set: new Set(Object.keys(ownStyle).flatMap(longhands)) },
    { source: StyleSource.SharedClass, set: new Set(Object.keys(sharedStyle).flatMap(longhands)) },
  ]
  return classNames.flatMap(className => {
    const wanted = utilityProperties(className)
    const properties = wanted.filter(property => sources.some(({ set }) => set.has(property)))
    if (!properties.length) return []
    const from = sources.filter(({ set }) => properties.some(property => set.has(property)))
    return [{ className, properties, sources: from.map(({ source }) => source) }]
  })
}
