/** Where an element sits inside the scrolling canvas, in the canvas's own content coordinates. */
export interface ElementBox {
  top: number
  left: number
  width: number
  height: number
}

export const findCanvasElement = (container: HTMLElement, id: string) =>
  container.querySelector<HTMLElement>(`[data-node-id="${CSS.escape(id)}"]`)

export function elementBox(container: HTMLElement, element: HTMLElement): ElementBox {
  const area = container.getBoundingClientRect()
  const rect = element.getBoundingClientRect()
  return {
    top: rect.top - area.top + container.scrollTop,
    left: rect.left - area.left + container.scrollLeft,
    width: rect.width,
    height: rect.height,
  }
}

/**
 * Top edge for a label of `height` pinned to an element: above it when there is room in the visible canvas,
 * otherwise just below it, and never outside what the user can see.
 */
export function labelTop(box: ElementBox, container: HTMLElement, height: number, gap: number): number {
  const visibleTop = container.scrollTop + gap
  const above = box.top - height - gap
  const below = box.top + box.height + gap
  const wanted = above >= visibleTop ? above : Math.min(below, container.scrollTop + container.clientHeight - height)
  return Math.round(Math.max(wanted, visibleTop))
}

/** Left edge for a label of `width` that starts at the element's left, kept inside the visible canvas. */
export function labelLeft(box: ElementBox, container: HTMLElement, width: number, gap: number): number {
  const maxLeft = container.scrollLeft + container.clientWidth - width - gap
  return Math.round(Math.max(gap, Math.min(box.left, maxLeft)))
}
