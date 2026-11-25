<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import {
  useUiTreeStore,
  describeBehaviors,
  getComponentDef,
  ROOT_NODE_ID,
  TEXT_NODE_TYPE,
} from '../../../entities/ui-node'
import { elementBox, findCanvasElement, labelTop, nodeIdAt, type ElementBox } from '../model/canvasGeometry'

/** Names the element under the pointer and outlines it, so similar elements can be told apart without a click. */
const props = defineProps<{ container?: HTMLElement }>()
const store = useUiTreeStore()

const BADGE_HEIGHT = 22
const BADGE_GAP = 4
const SHOW_DELAY_MS = 120

const hoveredId = ref<string | null>(null)
const box = ref<ElementBox | null>(null)
const badgeTop = ref(0)
let showTimer: ReturnType<typeof setTimeout> | undefined
let frame = 0

/** Text elements are skipped, and the page itself gets no badge. */
const elementAt = (target: EventTarget | null) => {
  const id = nodeIdAt(target, id => {
    const node = store.findNodeById(id)
    return !!node && node.type !== TEXT_NODE_TYPE
  })
  return id === ROOT_NODE_ID ? null : id
}

const place = () => {
  cancelAnimationFrame(frame)
  frame = requestAnimationFrame(() => {
    const container = props.container
    const element = container && hoveredId.value ? findCanvasElement(container, hoveredId.value) : null
    if (!container || !element) {
      box.value = null
      return
    }
    box.value = elementBox(container, element)
    badgeTop.value = labelTop(box.value, container, BADGE_HEIGHT, BADGE_GAP)
  })
}
const hover = (id: string | null) => {
  clearTimeout(showTimer)
  if (id === hoveredId.value) return
  if (!id) {
    hoveredId.value = null
    box.value = null
    return
  }
  // A short delay keeps the badge from flickering while the pointer crosses elements on its way somewhere else.
  showTimer = setTimeout(() => {
    hoveredId.value = id
    place()
  }, SHOW_DELAY_MS)
}
const onOver = (event: MouseEvent) => hover(elementAt(event.target))
const onLeave = () => hover(null)

watch(
  () => props.container,
  (container, previous) => {
    for (const [target, add] of [
      [previous, false],
      [container, true],
    ] as const) {
      if (!target) continue
      const method = add ? 'addEventListener' : 'removeEventListener'
      target[method]('mouseover', onOver as EventListener)
      target[method]('mouseleave', onLeave)
      target[method]('dragstart', onLeave)
      target[method]('scroll', place, { passive: true } as AddEventListenerOptions)
    }
  },
  { immediate: true },
)
onBeforeUnmount(() => {
  clearTimeout(showTimer)
  cancelAnimationFrame(frame)
  const container = props.container
  container?.removeEventListener('mouseover', onOver as EventListener)
  container?.removeEventListener('mouseleave', onLeave)
  container?.removeEventListener('dragstart', onLeave)
  container?.removeEventListener('scroll', place)
})

const node = computed(() => (hoveredId.value ? store.findNodeById(hoveredId.value) : null))
// The selected element already has its name in the toolbar, and the element may be gone after an edit.
const visible = computed(() => !!node.value && !!box.value && !store.selectedNodeIds.includes(node.value.id))
const name = computed(() => (node.value ? store.nodeLabel(node.value) : ''))
const kind = computed(() => {
  const label = node.value ? (getComponentDef(node.value.type)?.label ?? node.value.type) : ''
  // Showing "Button · Button" would only repeat itself.
  return label === name.value ? '' : label
})
const behavior = computed(() =>
  node.value
    ? describeBehaviors(node.value)
        .map(note => note.description)
        .join(' · ')
    : '',
)
</script>

<template>
  <template v-if="visible && box">
    <div
      class="hover-outline"
      aria-hidden="true"
      :style="{ top: `${box.top}px`, left: `${box.left}px`, width: `${box.width}px`, height: `${box.height}px` }"
    />
    <div class="hover-badge" aria-hidden="true" :style="{ top: `${badgeTop}px`, left: `${Math.max(4, box.left)}px` }">
      <span class="hover-badge__name">{{ name }}</span>
      <span v-if="kind" class="hover-badge__kind">{{ kind }}</span>
      <span v-if="behavior" class="hover-badge__behavior">{{ behavior }}</span>
    </div>
  </template>
</template>

<style scoped>
.hover-outline {
  position: absolute;
  z-index: 10;
  border: 1px solid rgb(var(--v-theme-primary));
  border-radius: 2px;
  background: rgba(var(--v-theme-primary), 0.05);
  pointer-events: none;
}
.hover-badge {
  position: absolute;
  z-index: 15;
  display: flex;
  max-width: 480px;
  align-items: center;
  gap: 6px;
  height: 22px;
  padding: 0 8px;
  border-radius: 4px;
  background: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-on-primary));
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  pointer-events: none;
}
.hover-badge__name {
  overflow: hidden;
  text-overflow: ellipsis;
}
.hover-badge__behavior {
  overflow: hidden;
  padding-left: 6px;
  border-left: 1px solid rgba(var(--v-theme-on-primary), 0.5);
  font-weight: 400;
  text-overflow: ellipsis;
}
.hover-badge__kind {
  font-weight: 400;
  opacity: 0.8;
}
</style>
