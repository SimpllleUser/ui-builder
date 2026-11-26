import type { Ref } from 'vue'
import {
  applyStyleClass,
  deleteStyleClass,
  moveStyleToClass,
  removeStyleClass,
  styleClassNameError,
} from './styleClasses'
import type { Project, UiNode } from './types'

interface StyleClassSources {
  project: Ref<Project>
  rootNode: Ref<UiNode>
  /** The element to change, unless it is missing or locked by an instance. */
  changeable(id: string): UiNode | null
  commit(): void
}

/** The shared style classes of the open project. Every command is one undo step. */
export function useStyleClassEditing({ project, rootNode, changeable, commit }: StyleClassSources) {
  const step = <T>(change: () => T): T => {
    commit()
    const result = change()
    commit()
    return result
  }
  const onElement = (id: string, change: (node: UiNode) => boolean) => {
    const node = changeable(id)
    return !!node && step(() => change(node))
  }
  const exists = (name: string) => Object.hasOwn(project.value.styleClasses ?? {}, name)

  return {
    /** Makes a class from the element's own style. Returns why it could not, or null. */
    createStyleClass(id: string, name: string): string | null {
      const error = styleClassNameError(project.value.styleClasses ?? {}, name)
      if (error) return error
      const created = onElement(id, node => moveStyleToClass(project.value, node, name))
      return created ? null : 'The element has no style of its own to save.'
    },
    /** Adds the element's own style to a class it already uses, changing every element with that class. */
    updateStyleClass: (id: string, name: string) =>
      exists(name) && onElement(id, node => moveStyleToClass(project.value, node, name)),
    applyStyleClass: (id: string, name: string) =>
      exists(name) &&
      onElement(id, node => {
        applyStyleClass(node, name)
        return true
      }),
    removeStyleClass: (id: string, name: string) =>
      onElement(id, node => {
        removeStyleClass(node, name)
        return true
      }),
    deleteStyleClass: (name: string) =>
      step(() => {
        const { pages, layout } = project.value
        const roots = [...pages.map(page => page.root), ...(layout ? [layout] : []), rootNode.value]
        return deleteStyleClass(project.value, roots, name)
      }),
  }
}
