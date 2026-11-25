import type { ElementBox } from './canvasGeometry'
import { DragHandle, type DragStart } from './dragResize'

export interface PlacedHandle {
  handle: DragHandle
  top: number
  left: number
}

/** A padding handle sits at the inner edge of the padding, but never closer to the element's edge than this. */
const MIN_PADDING_OFFSET = 8
/** Smaller elements have no room for two padding handles facing each other. */
const MIN_SIZE_FOR_PADDING = 48

/** Where the drag handles of an element go, in the canvas's coordinates. */
export function placeHandles(box: ElementBox, sizes: DragStart): PlacedHandle[] {
  const middle = box.left + box.width / 2
  const center = box.top + box.height / 2
  const right = box.left + box.width
  const bottom = box.top + box.height
  const inset = (padding: number) => Math.max(padding, MIN_PADDING_OFFSET)
  const handles: PlacedHandle[] = [
    { handle: DragHandle.Width, top: center, left: right },
    { handle: DragHandle.Height, top: bottom, left: middle },
    { handle: DragHandle.Corner, top: bottom, left: right },
  ]
  if (box.height >= MIN_SIZE_FOR_PADDING)
    handles.push(
      { handle: DragHandle.PaddingTop, top: box.top + inset(sizes.paddingTop), left: middle },
      { handle: DragHandle.PaddingBottom, top: bottom - inset(sizes.paddingBottom), left: middle },
    )
  if (box.width >= MIN_SIZE_FOR_PADDING)
    handles.push(
      { handle: DragHandle.PaddingLeft, top: center, left: box.left + inset(sizes.paddingLeft) },
      { handle: DragHandle.PaddingRight, top: center, left: right - inset(sizes.paddingRight) },
    )
  return handles
}
