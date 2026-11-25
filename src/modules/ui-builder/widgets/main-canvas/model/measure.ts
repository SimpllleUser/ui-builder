import type { ElementBox } from './canvasGeometry'

/** A distance drawn on the canvas: a line between two points and its length in pixels. */
export interface Measure {
  x1: number
  y1: number
  x2: number
  y2: number
  length: number
}

const right = (box: ElementBox) => box.left + box.width
const bottom = (box: ElementBox) => box.top + box.height
const centerX = (box: ElementBox) => box.left + box.width / 2
const centerY = (box: ElementBox) => box.top + box.height / 2
const contains = (outer: ElementBox, inner: ElementBox) =>
  outer.left <= inner.left && outer.top <= inner.top && right(outer) >= right(inner) && bottom(outer) >= bottom(inner)

const horizontal = (x1: number, x2: number, y: number): Measure => ({
  x1,
  y1: y,
  x2,
  y2: y,
  length: Math.round(Math.abs(x2 - x1)),
})
const vertical = (y1: number, y2: number, x: number): Measure => ({
  x1: x,
  y1,
  x2: x,
  y2,
  length: Math.round(Math.abs(y2 - y1)),
})

/** The four distances from the sides of the inner box to the sides of the box around it. */
const insets = (outer: ElementBox, inner: ElementBox) => [
  horizontal(outer.left, inner.left, centerY(inner)),
  horizontal(right(inner), right(outer), centerY(inner)),
  vertical(outer.top, inner.top, centerX(inner)),
  vertical(bottom(inner), bottom(outer), centerX(inner)),
]

/** The space between two boxes that stand apart, along each axis where there is some. */
function gaps(from: ElementBox, to: ElementBox): Measure[] {
  const measures: Measure[] = []
  if (right(from) <= to.left) measures.push(horizontal(right(from), to.left, centerY(from)))
  else if (right(to) <= from.left) measures.push(horizontal(right(to), from.left, centerY(from)))
  if (bottom(from) <= to.top) measures.push(vertical(bottom(from), to.top, centerX(from)))
  else if (bottom(to) <= from.top) measures.push(vertical(bottom(to), from.top, centerX(from)))
  return measures
}

/** What to show between the selected box and another one. Distances of zero are left out. */
export function measureBetween(selected: ElementBox, other: ElementBox): Measure[] {
  const measures = contains(other, selected)
    ? insets(other, selected)
    : contains(selected, other)
      ? insets(selected, other)
      : gaps(selected, other)
  return measures.filter(measure => measure.length > 0)
}
