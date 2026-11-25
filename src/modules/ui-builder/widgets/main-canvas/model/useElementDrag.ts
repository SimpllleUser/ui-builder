import { onBeforeUnmount, ref } from 'vue'
import { columnPropFor, columnsForWidth, GRID_COLUMN_TYPE, useUiTreeStore } from '../../../entities/ui-node'
import { toPx } from '../../../../../shared/lib/inlineStyle'
import { dragValues, type DragHandle, type DragStart, type DragValues } from './dragResize'

interface Drag {
  handle: DragHandle
  nodeId: string
  start: DragStart
  originX: number
  originY: number
  rowWidth: number
  end(): void
}

/** Changes the size or padding of an element while one of its handles is dragged. A whole drag is one undo step. */
export function useElementDrag() {
  const store = useUiTreeStore()
  const dragging = ref<DragHandle | null>(null)
  const label = ref('')
  let drag: Drag | null = null

  const apply = (current: Drag, values: DragValues) => {
    const node = store.findNodeById(current.nodeId)
    if (!node) return
    const { width, ...rest } = values
    // A grid column is as wide as its columns say, so its width is set in Vuetify's twelve columns.
    const isColumn = node.type === GRID_COLUMN_TYPE
    if (width !== undefined && isColumn) {
      const property = columnPropFor(node.props, store.editingBreakpoint, window.innerWidth)
      const columns = columnsForWidth(width, current.rowWidth)
      store.updateNodeProp(node.id, property, columns)
      label.value = `${property}: ${columns} / 12`
    }
    const pixels = isColumn ? rest : values
    const entries = Object.entries(pixels)
    if (!entries.length) return
    store.updateNodeStyle(node.id, Object.fromEntries(entries.map(([name, value]) => [name, toPx(value)])))
    label.value = entries.map(([name, value]) => `${name} ${value}`).join(' · ')
  }

  const finish = () => {
    drag?.end()
    drag = null
    dragging.value = null
    label.value = ''
  }
  const begin = (event: PointerEvent, handle: DragHandle, nodeId: string, element: HTMLElement, start: DragStart) => {
    if (event.button !== 0) return
    event.preventDefault()
    finish()
    ;(event.currentTarget instanceof Element ? event.currentTarget : null)?.setPointerCapture(event.pointerId)
    drag = {
      handle,
      nodeId,
      start,
      originX: event.clientX,
      originY: event.clientY,
      rowWidth: element.parentElement?.clientWidth ?? 0,
      end: store.startGesture(),
    }
    dragging.value = handle
  }
  const move = (event: PointerEvent) => {
    if (!drag) return
    const dx = event.clientX - drag.originX
    const dy = event.clientY - drag.originY
    apply(drag, dragValues(drag.handle, drag.start, dx, dy, event.shiftKey))
  }

  onBeforeUnmount(finish)
  return { dragging, label, begin, move, finish }
}
