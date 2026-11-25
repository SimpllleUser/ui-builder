<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useUiTreeStore, TEXT_NODE_TYPE } from '../../../entities/ui-node'
import { elementBox, findCanvasElement, nodeIdAt } from '../model/canvasGeometry'
import { measureBetween, type Measure } from '../model/measure'
import { useCanvasUpdates } from '../model/useCanvasUpdates'

/** While Alt is held, shows how far the selected element is from the element under the pointer. */
const props = defineProps<{ container?: HTMLElement }>()
const store = useUiTreeStore()

const measures = ref<Measure[]>([])
let altHeld = false
let hoveredId: string | null = null

/** The element to measure against: the one under the pointer, or the parent when that is the selection itself. */
const otherId = (selectedId: string) =>
  hoveredId && hoveredId !== selectedId ? hoveredId : (store.findParentAndIndex(selectedId)?.parent.id ?? null)

const measure = (): Measure[] => {
  const container = props.container
  const selectedId = store.selectedNodeIds.length === 1 ? store.selectedNodeId : null
  if (!altHeld || !container || !selectedId) return []
  const targetId = otherId(selectedId)
  const selected = findCanvasElement(container, selectedId)
  const target = targetId ? findCanvasElement(container, targetId) : null
  return selected && target ? measureBetween(elementBox(container, selected), elementBox(container, target)) : []
}
const update = useCanvasUpdates(
  () => props.container,
  () => {
    const next = measure()
    if (JSON.stringify(next) !== JSON.stringify(measures.value)) measures.value = next
  },
)

const onPointer = (event: PointerEvent) => {
  altHeld = event.altKey
  hoveredId = nodeIdAt(event.target, id => {
    const node = store.findNodeById(id)
    return !!node && node.type !== TEXT_NODE_TYPE
  })
  update()
}
const onKey = (event: KeyboardEvent) => {
  if (event.key !== 'Alt') return
  altHeld = event.type === 'keydown'
  // Alone, Alt would move the focus to the browser's menu on Windows.
  if (store.selectedNodeId) event.preventDefault()
  update()
}
const release = () => {
  altHeld = false
  update()
}

watch(
  () => props.container,
  (container, previous) => {
    previous?.removeEventListener('pointermove', onPointer)
    container?.addEventListener('pointermove', onPointer)
  },
  { immediate: true },
)
watch(() => store.selectedNodeId, update)
onMounted(() => {
  window.addEventListener('keydown', onKey)
  window.addEventListener('keyup', onKey)
  window.addEventListener('blur', release)
})
onBeforeUnmount(() => {
  props.container?.removeEventListener('pointermove', onPointer)
  window.removeEventListener('keydown', onKey)
  window.removeEventListener('keyup', onKey)
  window.removeEventListener('blur', release)
})
</script>

<template>
  <template v-for="(item, index) in measures" :key="index">
    <div
      class="measure-line"
      aria-hidden="true"
      :style="{
        left: `${Math.min(item.x1, item.x2)}px`,
        top: `${Math.min(item.y1, item.y2)}px`,
        width: `${Math.max(Math.abs(item.x2 - item.x1), 1)}px`,
        height: `${Math.max(Math.abs(item.y2 - item.y1), 1)}px`,
      }"
    />
    <div
      class="measure-label"
      aria-hidden="true"
      :style="{ left: `${(item.x1 + item.x2) / 2}px`, top: `${(item.y1 + item.y2) / 2}px` }"
    >
      {{ item.length }}
    </div>
  </template>
</template>

<style scoped>
.measure-line {
  position: absolute;
  z-index: 22;
  background: rgb(var(--v-theme-error));
  pointer-events: none;
}
.measure-label {
  position: absolute;
  z-index: 23;
  padding: 0 5px;
  border-radius: 4px;
  background: rgb(var(--v-theme-error));
  color: rgb(var(--v-theme-on-error));
  font-size: 11px;
  font-weight: 600;
  line-height: 16px;
  transform: translate(-50%, -50%);
  pointer-events: none;
}
</style>
