import { parsePx, type StyleMap } from '../../../../../shared/lib/inlineStyle'

export enum Axis {
  Row = 'row',
  Column = 'column',
}
/** A place along one direction: the start, the middle or the end. */
export enum Position {
  Start = 'start',
  Center = 'center',
  End = 'end',
}
export enum TextAlign {
  Left = 'left',
  Center = 'center',
  Right = 'right',
  Justify = 'justify',
}
export enum SizeMode {
  Fixed = 'fixed',
  Fill = 'fill',
  Hug = 'hug',
}
export enum Side {
  Top = 'Top',
  Right = 'Right',
  Bottom = 'Bottom',
  Left = 'Left',
}
export enum Corner {
  TopLeft = 'TopLeft',
  TopRight = 'TopRight',
  BottomRight = 'BottomRight',
  BottomLeft = 'BottomLeft',
}
/** Which box a spacing belongs to; the value is the CSS property prefix. */
export enum SpacingBox {
  Margin = 'margin',
  Padding = 'padding',
}

/** CSS words the design controls write or recognise. */
export enum CssValue {
  Flex = 'flex',
  Column = 'column',
  Wrap = 'wrap',
  Solid = 'solid',
  Fill = '100%',
  Hug = 'fit-content',
}
export const DEFAULT_STROKE_WIDTH = '1px'

export const spacingProperty = (box: SpacingBox, side: Side) => `${box}${side}`
export const cornerProperty = (corner: Corner) => `border${corner}Radius`

// ─── Size ─────────────────────────────────────────────────────────────────────
export function sizeMode(value: string | undefined): SizeMode | null {
  if (value === CssValue.Fill) return SizeMode.Fill
  if (value === CssValue.Hug) return SizeMode.Hug
  return parsePx(value) === null ? null : SizeMode.Fixed
}

/** The CSS value for a size mode. A fixed size keeps the current pixels, or starts from `fallback`. */
export function sizeValue(mode: SizeMode, current: string | undefined, fallback: number): string {
  if (mode === SizeMode.Fill) return CssValue.Fill
  if (mode === SizeMode.Hug) return CssValue.Hug
  return `${parsePx(current) ?? fallback}px`
}

// ─── Layout and alignment ─────────────────────────────────────────────────────
const FLEX_VALUE: Record<Position, string> = {
  [Position.Start]: 'flex-start',
  [Position.Center]: 'center',
  [Position.End]: 'flex-end',
}
const POSITION_OF = new Map<string, Position>(Object.values(Position).map(position => [FLEX_VALUE[position], position]))

export interface Alignment {
  horizontal: Position
  vertical: Position
}

/**
 * The flex properties that put the children at a corner, an edge or the middle of the box.
 * In a row the horizontal choice is the main axis; in a column the roles swap.
 */
export function alignmentStyle(axis: Axis, { horizontal, vertical }: Alignment): Record<string, string> {
  const [main, cross] = axis === Axis.Row ? [horizontal, vertical] : [vertical, horizontal]
  return { justifyContent: FLEX_VALUE[main], alignItems: FLEX_VALUE[cross] }
}

/** Which cell of the alignment grid the style currently describes, or null when it describes none. */
export function readAlignment(style: StyleMap): Alignment | null {
  const main = POSITION_OF.get(style.justifyContent ?? FLEX_VALUE[Position.Start])
  const cross = POSITION_OF.get(style.alignItems ?? FLEX_VALUE[Position.Start])
  if (!main || !cross) return null
  return readAxis(style) === Axis.Row ? { horizontal: main, vertical: cross } : { horizontal: cross, vertical: main }
}

export const isFlex = (style: StyleMap) => style.display === CssValue.Flex
export const readAxis = (style: StyleMap) => (style.flexDirection === CssValue.Column ? Axis.Column : Axis.Row)
