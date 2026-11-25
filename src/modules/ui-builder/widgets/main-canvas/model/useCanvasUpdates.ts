import { onBeforeUnmount, onMounted, watch } from 'vue'

/**
 * Calls `update` on the next frame whenever something drawn on the canvas may have moved: its content, its size
 * or its scroll position. `update` must not change anything when nothing moved, or it would call itself forever.
 * Returns a function that asks for an update.
 */
export function useCanvasUpdates(container: () => HTMLElement | undefined, update: () => void) {
  let frame = 0
  let stop = () => {}
  const schedule = () => {
    cancelAnimationFrame(frame)
    frame = requestAnimationFrame(update)
  }
  const observe = () => {
    stop()
    const element = container()
    if (!element) return
    const resize = new ResizeObserver(schedule)
    resize.observe(element)
    const mutation = new MutationObserver(schedule)
    mutation.observe(element, { childList: true, subtree: true, attributes: true, characterData: true })
    element.addEventListener('scroll', schedule, { passive: true })
    stop = () => {
      resize.disconnect()
      mutation.disconnect()
      element.removeEventListener('scroll', schedule)
    }
    schedule()
  }
  onMounted(() => {
    observe()
    window.addEventListener('resize', schedule)
  })
  onBeforeUnmount(() => {
    cancelAnimationFrame(frame)
    stop()
    window.removeEventListener('resize', schedule)
  })
  watch(container, observe)
  return schedule
}
