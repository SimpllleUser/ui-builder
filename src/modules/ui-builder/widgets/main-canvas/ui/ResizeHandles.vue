<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ROOT_NODE_ID, TEXT_NODE_TYPE, useUiTreeStore } from '../../../entities/ui-node'
import { parsePx } from '../../../../../shared/lib/inlineStyle'
import { elementBox, findCanvasElement, type ElementBox } from '../model/canvasGeometry'
import { DragHandle, type DragStart } from '../model/dragResize'
import { placeHandles } from '../model/handlePlacement'
import { useCanvasUpdates } from '../model/useCanvasUpdates'
import { useElementDrag } from '../model/useElementDrag'

/** Handles on the selected element: drag its edges to resize it, or the inner bars to change its padding. */
const props = defineProps<{ container?: HTMLElement }>()
const store = useUiTreeStore()
const { dragging, label, begin, move, finish } = useElementDrag()

/** Placeholders stand in for the element, so its sizes cannot be read from them. */
const PLACEHOLDERS = '.overlay-placeholder, .outlet-placeholder'
const HANDLE_NAMES: Record<DragHandle, string> = {
  [DragHandle.Width]: 'width',
  [DragHandle.Height]: 'height',
  [DragHandle.Corner]: 'width and height',
  [DragHandle.PaddingTop]: 'top padding',
  [DragHandle.PaddingRight]: 'right padding',
  [DragHandle.PaddingBottom]: 'bottom padding',
  [DragHandle.PaddingLeft]: 'left padding',
}

interface Measured {
  box: ElementBox
  sizes: DragStart
}
const measured = ref<Measured | null>(null)

const node = computed(() => (store.selectedNodeIds.length === 1 ? store.findNodeById(store.selectedNodeId!) : null))
const resizable = computed(() => !!node.value && node.value.id !== ROOT_NODE_ID && node.value.type !== TEXT_NODE_TYPE)
const selectedElement = () => {
  const element = props.container && node.value ? findCanvasElement(props.container, node.value.id) : null
  return element && !element.matches(PLACEHOLDERS) ? element : null
}

const measureElement = (): Measured | null => {
  const container = props.container
  const element = resizable.value ? selectedElement() : null
  if (!container || !element) return null
  const box = elementBox(container, element)
  const style = getComputedStyle(element)
  const padding = (value: string) => parsePx(value) ?? 0
  return {
    box,
    sizes: {
      width: box.width,
      height: box.height,
      paddingTop: padding(style.paddingTop),
      paddingRight: padding(style.paddingRight),
      paddingBottom: padding(style.paddingBottom),
      paddingLeft: padding(style.paddingLeft),
    },
  }
}
const update = useCanvasUpdates(
  () => props.container,
  () => {
    const next = measureElement()
    if (JSON.stringify(next) !== JSON.stringify(measured.value)) measured.value = next
  },
)
watch(node, () => {
  finish()
  update()
})

const handles = computed(() => (measured.value ? placeHandles(measured.value.box, measured.value.sizes) : []))
const start = (event: PointerEvent, handle: DragHandle) => {
  const element = selectedElement()
  if (element && node.value && measured.value) begin(event, handle, node.value.id, element, measured.value.sizes)
}
</script>

<template>
  <div
    v-for="item in handles"
    :key="item.handle"
    class="resize-handle"
    :class="[`resize-handle--${item.handle}`, { 'resize-handle--active': dragging === item.handle }]"
    :title="`Drag to change the ${HANDLE_NAMES[item.handle]} (Shift: steps of 10)`"
    aria-hidden="true"
    :style="{ top: `${item.top}px`, left: `${item.left}px` }"
    @pointerdown.stop="start($event, item.handle)"
    @pointermove="move"
    @pointerup="finish"
    @pointercancel="finish"
    @lostpointercapture="finish"
    @click.stop
  />
  <div
    v-if="label && measured"
    class="resize-label"
    role="status"
    :style="{ top: `${measured.box.top + measured.box.height + 10}px`, left: `${measured.box.left}px` }"
  >
    {{ label }}
  </div>
</template>

<style scoped>
.resize-handle {
  position: absolute;
  z-index: 21;
  width: 9px;
  height: 9px;
  border: 1px solid rgb(var(--v-theme-primary));
  border-radius: 2px;
  background: rgb(var(--v-theme-surface));
  transform: translate(-50%, -50%);
  touch-action: none;
}
.resize-handle--width {
  height: 18px;
  cursor: ew-resize;
}
.resize-handle--height {
  width: 18px;
  cursor: ns-resize;
}
.resize-handle--corner {
  cursor: nwse-resize;
}
.resize-handle[class*='--padding'] {
  border-color: rgb(var(--v-theme-success));
  border-radius: 3px;
  background: rgb(var(--v-theme-success));
  opacity: 0.55;
}
.resize-handle--paddingTop,
.resize-handle--paddingBottom {
  width: 16px;
  height: 5px;
  cursor: ns-resize;
}
.resize-handle--paddingLeft,
.resize-handle--paddingRight {
  width: 5px;
  height: 16px;
  cursor: ew-resize;
}
.resize-handle[class*='--padding']:hover,
.resize-handle--active {
  opacity: 1;
}
.resize-label {
  position: absolute;
  z-index: 24;
  padding: 1px 6px;
  border-radius: 4px;
  background: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-on-primary));
  font-size: 12px;
  white-space: nowrap;
  pointer-events: none;
}
</style>
