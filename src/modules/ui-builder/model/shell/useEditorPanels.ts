import { computed, onBeforeUnmount, ref, watch, type Ref } from 'vue'
import { useStorage } from '@vueuse/core'
import { PanelSide } from './panelSide'
import type { useUiTreeStore } from '../../entities/ui-node/model/store'

const MIN_WIDTH = 260
const MAX_WIDTH = 480
const SLIM_WIDTH = 40
const ANIMATION_MS = 250

/**
 * The two side panels: whether each is open, how wide, and the way they adapt to the screen and the selection.
 * On a wide screen Properties shrinks to a slim strip while nothing is selected, so the canvas gets the space.
 */
export function useEditorPanels(store: ReturnType<typeof useUiTreeStore>, narrow: Ref<boolean>) {
  const leftOpen = ref(true)
  const rightOpen = ref(true)
  const leftWidth = useStorage('ui-builder:left-width', 300)
  const rightWidth = useStorage('ui-builder:right-width', 340)

  const hasSelection = computed(() => store.selectedNodeIds.length > 0)
  const rightSlim = computed(() => rightOpen.value && !hasSelection.value && !narrow.value)
  const rightFull = computed(() => rightOpen.value && !rightSlim.value)
  const rightPanelWidth = computed(() => (rightSlim.value ? `${SLIM_WIDTH}px` : `${rightWidth.value}px`))

  // Animate the width change that selecting causes, but not while dragging the divider.
  const animating = ref(false)
  let animationTimer: ReturnType<typeof setTimeout> | undefined
  watch(rightSlim, () => {
    animating.value = true
    clearTimeout(animationTimer)
    animationTimer = setTimeout(() => (animating.value = false), ANIMATION_MS)
  })

  // Overlay panels on a narrow screen start closed; wide screens start with both open.
  watch(
    narrow,
    isNarrow => {
      leftOpen.value = !isNarrow
      rightOpen.value = !isNarrow
    },
    { immediate: true },
  )

  const closeAll = () => {
    leftOpen.value = false
    rightOpen.value = false
  }
  const openComponents = () => {
    leftOpen.value = true
    if (narrow.value) rightOpen.value = false
  }
  /** On a narrow screen opening one panel closes the other, since they cover the canvas. */
  const toggle = (side: PanelSide) => {
    const [mine, other] = side === PanelSide.Left ? [leftOpen, rightOpen] : [rightOpen, leftOpen]
    mine.value = !mine.value
    if (narrow.value) other.value = false
  }

  const resize = (side: PanelSide, delta: number) => {
    const width = side === PanelSide.Left ? leftWidth : rightWidth
    width.value = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, width.value + delta))
  }
  let stopResize: (() => void) | undefined
  const startResize = (event: PointerEvent, side: PanelSide) => {
    event.preventDefault()
    stopResize?.()
    let x = event.clientX
    const move = (e: PointerEvent) => {
      resize(side, (e.clientX - x) * (side === PanelSide.Left ? 1 : -1))
      x = e.clientX
    }
    const stop = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', stop)
      window.removeEventListener('pointercancel', stop)
    }
    stopResize = stop
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', stop, { once: true })
    window.addEventListener('pointercancel', stop, { once: true })
  }

  onBeforeUnmount(() => stopResize?.())

  return {
    leftOpen,
    rightOpen,
    leftWidth,
    rightWidth,
    rightSlim,
    rightFull,
    rightPanelWidth,
    animating,
    closeAll,
    openComponents,
    toggle,
    resize,
    startResize,
    limits: { min: MIN_WIDTH, max: MAX_WIDTH },
  }
}
