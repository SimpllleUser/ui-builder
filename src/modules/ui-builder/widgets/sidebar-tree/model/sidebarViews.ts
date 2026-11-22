export enum SidebarView {
  Components = 'components',
  Layers = 'layers',
  Prefabs = 'prefabs',
  History = 'history',
}

/** The views the activity bar switches between, in the order shown. */
export const SIDEBAR_VIEWS: Array<{ id: SidebarView; icon: string; label: string }> = [
  { id: SidebarView.Components, icon: 'mdi-shape-outline', label: 'Components' },
  { id: SidebarView.Layers, icon: 'mdi-file-tree-outline', label: 'Layers' },
  { id: SidebarView.Prefabs, icon: 'mdi-puzzle-outline', label: 'My components' },
  { id: SidebarView.History, icon: 'mdi-history', label: 'History' },
]

export const LAYERS_HELP =
  'Use ↑ ↓ to move, ← → to collapse or expand, Enter to select. Shift-click selects several elements.'
