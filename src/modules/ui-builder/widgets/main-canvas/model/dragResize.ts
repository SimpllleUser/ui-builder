/** What can be dragged on a selected element. */
export enum DragHandle {
  Width = 'width',
  Height = 'height',
  Corner = 'corner',
  PaddingTop = 'paddingTop',
  PaddingRight = 'paddingRight',
  PaddingBottom = 'paddingBottom',
  PaddingLeft = 'paddingLeft',
}

/** The sizes of an element in pixels when a drag starts. */
export interface DragStart {
  width: number
  height: number
  paddingTop: number
  paddingRight: number
  paddingBottom: number
  paddingLeft: number
}

export type DragValues = Partial<DragStart>

const FINE_STEP = 1
const COARSE_STEP = 10

/**
 * The new sizes after the pointer moved by (`dx`, `dy`). Padding grows as its handle moves into the element.
 * `coarse` (Shift) moves in steps of ten. A size that did not change is left out.
 */
export function dragValues(handle: DragHandle, start: DragStart, dx: number, dy: number, coarse = false): DragValues {
  const step = coarse ? COARSE_STEP : FINE_STEP
  const changed = (key: keyof DragStart, delta: number): DragValues => {
    const value = Math.max(0, Math.round((start[key] + delta) / step) * step)
    return delta && value !== Math.round(start[key]) ? { [key]: value } : {}
  }
  switch (handle) {
    case DragHandle.Width:
      return changed('width', dx)
    case DragHandle.Height:
      return changed('height', dy)
    case DragHandle.Corner:
      return { ...changed('width', dx), ...changed('height', dy) }
    case DragHandle.PaddingTop:
      return changed('paddingTop', dy)
    case DragHandle.PaddingRight:
      return changed('paddingRight', -dx)
    case DragHandle.PaddingBottom:
      return changed('paddingBottom', -dy)
    case DragHandle.PaddingLeft:
      return changed('paddingLeft', dx)
  }
}
