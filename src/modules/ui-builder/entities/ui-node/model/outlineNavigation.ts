import { OutlineKind, type OutlineSection } from './structureOutline'
import type { useUiTreeStore } from './store'

type Store = ReturnType<typeof useUiTreeStore>

/** Whether the page, layout or component of this section is the one on the canvas now. */
export function isCurrentSection(store: Store, section: OutlineSection): boolean {
  if (store.editingPrefab) return section.kind === OutlineKind.Component && section.id === store.editingPrefab.prefabId
  if (store.editingLayout) return section.kind === OutlineKind.Layout
  return section.kind === OutlineKind.Page && section.id === store.activePage.id
}

/** Makes the page, layout or component the one being edited, so its elements can be selected. */
export function openSection(store: Store, section: OutlineSection) {
  if (section.kind === OutlineKind.Component) {
    store.editPrefab(section.id)
    return
  }
  // A page or the layout takes the canvas back from a component that was open.
  store.stopEditingPrefab()
  if (section.kind === OutlineKind.Page) store.selectPage(section.id)
  else store.editLayout(true)
}

/** Selects an element of a section, opening the section first when it is not the current one. */
export function selectInSection(store: Store, section: OutlineSection, nodeId: string) {
  if (!isCurrentSection(store, section)) openSection(store, section)
  store.selectNode(nodeId)
}
