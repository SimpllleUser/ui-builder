<script setup lang="ts">
import { StepDirection, useUiTreeStore, ROOT_NODE_ID, TEXT_NODE_TYPE } from '../../../entities/ui-node'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { elementBox, findCanvasElement, labelLeft, labelTop } from '../model/canvasGeometry'

/** Quick actions next to the selected element, so common edits do not need a trip to the Inspector. */
const props = defineProps<{ container?: HTMLElement }>()
const store = useUiTreeStore()

const TOOLBAR_GAP = 6
const TOOLBAR_HEIGHT = 34

const toolbar = ref<HTMLElement>()
const position = ref<{ top: number; left: number } | null>(null)
const textMenu = ref(false)

const node = computed(() => (store.selectedNodeIds.length === 1 ? store.findNodeById(store.selectedNodeId!) : null))
const visible = computed(() => !!node.value && node.value.id !== ROOT_NODE_ID && !!position.value)
const label = computed(() => (node.value ? store.nodeLabel(node.value) : ''))
const parent = computed(() => (node.value ? store.findParentAndIndex(node.value.id)?.parent : undefined))
/** The element's own text: a text child (buttons, headings) or the text element itself. */
const textNode = computed(() =>
  node.value?.type === TEXT_NODE_TYPE ? node.value : node.value?.children.find(child => child.type === TEXT_NODE_TYPE),
)

// Place the toolbar above the element (below it when there is no room), kept inside the visible canvas.
let frame = 0
const update = () => {
  cancelAnimationFrame(frame)
  frame = requestAnimationFrame(() => {
    const container = props.container
    const id = store.selectedNodeId
    const element = container && id ? findCanvasElement(container, id) : null
    if (!container || !element || store.selectedNodeIds.length !== 1) {
      position.value = null
      return
    }
    const box = elementBox(container, element)
    const next = {
      top: labelTop(box, container, TOOLBAR_HEIGHT, TOOLBAR_GAP),
      left: labelLeft(box, container, toolbar.value?.offsetWidth ?? 0, TOOLBAR_GAP),
    }
    // Only change when it moved, otherwise re-rendering would keep triggering the observers.
    if (position.value?.top !== next.top || position.value?.left !== next.left) position.value = next
  })
}

let observers: Array<{ disconnect(): void }> = []
const observe = () => {
  observers.forEach(observer => observer.disconnect())
  observers = []
  const container = props.container
  if (!container) return
  const resize = new ResizeObserver(update)
  resize.observe(container)
  const mutation = new MutationObserver(update)
  mutation.observe(container, { childList: true, subtree: true, attributes: true, characterData: true })
  observers = [resize, mutation]
  container.addEventListener('scroll', update, { passive: true })
}
onMounted(() => {
  observe()
  window.addEventListener('resize', update)
})
onBeforeUnmount(() => {
  cancelAnimationFrame(frame)
  observers.forEach(observer => observer.disconnect())
  props.container?.removeEventListener('scroll', update)
  window.removeEventListener('resize', update)
})
watch(() => props.container, observe)
watch(
  () => store.selectedNodeIds.slice(),
  async () => {
    textMenu.value = false
    await nextTick()
    update()
  },
  { immediate: true },
)
// The toolbar's own width is known only once it is rendered, so place it again then.
watch(visible, async () => {
  await nextTick()
  update()
})

const selectParent = () => parent.value && store.selectNode(parent.value.id)
const remove = () => node.value && store.deleteNode(node.value.id)
const duplicate = () => node.value && store.duplicateNode(node.value.id)
const move = (direction: StepDirection) => node.value && store.reorderNode(node.value.id, direction)
const editText = (value: string) => textNode.value && store.updateNodeName(textNode.value.id, value)
</script>

<template>
  <div
    v-if="node && node.id !== ROOT_NODE_ID && position"
    ref="toolbar"
    class="selection-toolbar"
    role="toolbar"
    aria-label="Actions for the selected element"
    :style="{ top: `${position.top}px`, left: `${position.left}px` }"
    @click.stop
    @dblclick.stop
    @pointerdown.stop
  >
    <span class="selection-toolbar__name" :title="label">{{ label }}</span>
    <VBtn
      icon="mdi-arrow-up-left"
      size="x-small"
      variant="text"
      :disabled="!parent"
      aria-label="Select parent"
      title="Select parent"
      @click="selectParent"
    />
    <VBtn
      icon="mdi-arrow-up"
      size="x-small"
      variant="text"
      :disabled="!store.canReorder(node.id, StepDirection.Back)"
      aria-label="Move up"
      title="Move up"
      @click="move(StepDirection.Back)"
    />
    <VBtn
      icon="mdi-arrow-down"
      size="x-small"
      variant="text"
      :disabled="!store.canReorder(node.id, StepDirection.Forward)"
      aria-label="Move down"
      title="Move down"
      @click="move(StepDirection.Forward)"
    />
    <VMenu v-if="textNode" v-model="textMenu" :close-on-content-click="false" location="bottom start">
      <template #activator="{ props: menu }">
        <VBtn
          v-bind="menu"
          icon="mdi-format-text"
          size="x-small"
          variant="text"
          aria-label="Edit text"
          title="Edit text"
        />
      </template>
      <VCard min-width="260" class="pa-2">
        <VTextarea
          :model-value="textNode.name"
          label="Text"
          variant="outlined"
          density="compact"
          rows="2"
          auto-grow
          autofocus
          hide-details
          @update:model-value="editText"
          @blur="store.commit()"
          @keydown.esc.stop="textMenu = false"
        />
      </VCard>
    </VMenu>
    <VBtn
      icon="mdi-content-copy"
      size="x-small"
      variant="text"
      aria-label="Duplicate"
      title="Duplicate"
      @click="duplicate"
    />
    <VBtn
      icon="mdi-delete-outline"
      size="x-small"
      variant="text"
      color="error"
      aria-label="Delete"
      title="Delete"
      @click="remove"
    />
  </div>
</template>

<style scoped>
.selection-toolbar {
  position: absolute;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 2px;
  height: 34px;
  padding: 0 4px 0 10px;
  border-radius: 8px;
  background: rgb(var(--v-theme-surface));
  box-shadow:
    0 2px 10px rgba(0, 0, 0, 0.18),
    0 0 0 1px rgba(var(--v-border-color), 0.2);
}
.selection-toolbar__name {
  max-width: 140px;
  margin-right: 4px;
  overflow: hidden;
  color: rgb(var(--v-theme-primary));
  font-size: 12px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
