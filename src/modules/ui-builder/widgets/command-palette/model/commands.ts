import {
  FieldKind,
  StepDirection,
  PALETTE_COMPONENTS,
  childNodes,
  getComponentCategory,
  getComponentDef,
  TEXT_NODE_TYPE,
  ROOT_NODE_ID,
  describeFields,
  TEMPLATES,
  type TemplateKind,
  type useUiTreeStore,
  type UiNode,
} from '../../../entities/ui-node'

type Store = ReturnType<typeof useUiTreeStore>

export interface Command {
  id: string
  title: string
  subtitle?: string
  group: string
  icon: string
  /** Extra words that should find this command. */
  keywords?: string
  /** Keyboard shortcut shown next to the title. */
  shortcut?: string
  run(): void
}

/** What only the editor shell can do (panels, dialogs, file pickers). */
export interface CommandHost {
  addPage(): void
  renameCurrentPage(): void
  importProject(): void
  exportProject(): void
  startTour(): void
  openBehaviorGuide(): void
  openCodeExport(): void
  openThemeSettings(): void
  openProjects(): void
  newProject(): void
  /** Asks for the template's settings first when it has any. */
  addTemplate(kind: TemplateKind): void
  openStructureGraph(): void
  toggleFocus(): void
  toggleLayersPanel(): void
  toggleProperties(): void
  /** ⌘ on macOS, Ctrl elsewhere. */
  modifierKey: string
}

const MAX_ELEMENTS = 150

function elements(root: UiNode): Array<{ node: UiNode; parent: UiNode }> {
  const found: Array<{ node: UiNode; parent: UiNode }> = []
  const visit = (node: UiNode) => {
    for (const child of childNodes(node)) {
      if (child.type !== TEXT_NODE_TYPE && found.length < MAX_ELEMENTS) found.push({ node: child, parent: node })
      visit(child)
    }
  }
  visit(root)
  return found
}

/** Everything the command palette can do right now. Declared most useful first, so ties rank in this order. */
export function buildCommands(store: Store, host: CommandHost): Command[] {
  const commands: Command[] = []
  const add = (command: Command) => commands.push(command)
  const selected = store.selectedNodeIds.length === 1 ? store.findNodeById(store.selectedNodeId!) : null
  const mod = host.modifierKey

  // ─── The selected element ──────────────────────────────────────────────────
  if (selected && selected.id !== ROOT_NODE_ID) {
    const name = store.nodeLabel(selected)
    const group = `Selected: ${name}`
    const parent = store.findParentAndIndex(selected.id)?.parent
    add({
      id: 'sel:duplicate',
      title: 'Duplicate',
      group,
      icon: 'mdi-content-copy',
      keywords: 'copy clone',
      run: () => store.duplicateNode(selected.id),
    })
    add({
      id: 'sel:delete',
      title: 'Delete',
      group,
      icon: 'mdi-delete-outline',
      keywords: 'remove',
      run: () => store.deleteNode(selected.id),
    })
    if (parent)
      add({
        id: 'sel:parent',
        title: 'Select parent',
        subtitle: store.nodeLabel(parent),
        group,
        icon: 'mdi-arrow-up-left',
        run: () => store.selectNode(parent.id),
      })
    if (store.canReorder(selected.id, StepDirection.Back))
      add({
        id: 'sel:up',
        title: 'Move up',
        group,
        icon: 'mdi-arrow-up',
        keywords: 'order earlier',
        run: () => store.reorderNode(selected.id, StepDirection.Back),
      })
    if (store.canReorder(selected.id, StepDirection.Forward))
      add({
        id: 'sel:down',
        title: 'Move down',
        group,
        icon: 'mdi-arrow-down',
        keywords: 'order later',
        run: () => store.reorderNode(selected.id, StepDirection.Forward),
      })

    // Its settings: switches toggle, choices list every option.
    for (const field of describeFields(selected.type)) {
      const current = selected.props[field.prop]
      const set = (value: unknown) => {
        store.updateNodeProp(selected.id, field.prop, value)
        store.commit()
      }
      if (field.kind === FieldKind.Switch) {
        add({
          id: `set:${field.prop}`,
          title: `${field.label}: ${current === true ? 'turn off' : 'turn on'}`,
          subtitle: `${name} setting`,
          group: 'Settings',
          icon: 'mdi-toggle-switch-outline',
          keywords: `${field.prop} ${field.label} toggle`,
          run: () => set(current !== true),
        })
      } else if (field.kind === FieldKind.Select && field.options) {
        for (const option of field.options) {
          add({
            id: `set:${field.prop}:${option}`,
            title: `${field.label}: ${option}`,
            subtitle: current === option ? `${name} setting · current` : `${name} setting`,
            group: 'Settings',
            icon: 'mdi-tune-variant',
            keywords: `${field.prop} ${field.label}`,
            run: () => set(option),
          })
        }
      }
    }
  }

  // ─── Pages ─────────────────────────────────────────────────────────────────
  for (const page of store.pages) {
    const current = !store.editingLayout && page.id === store.activePage.id
    add({
      id: `page:${page.id}`,
      title: `Go to ${page.name}`,
      subtitle: current ? `${page.path} · current page` : page.path,
      group: 'Pages',
      icon: 'mdi-file-outline',
      keywords: `page open switch ${page.path}`,
      run: () => store.selectPage(page.id),
    })
  }
  add({
    id: 'page:new',
    title: 'New page…',
    group: 'Pages',
    icon: 'mdi-file-plus-outline',
    keywords: 'add create page',
    run: host.addPage,
  })
  add({
    id: 'page:rename',
    title: 'Rename page or change route…',
    subtitle: store.activePage.name,
    group: 'Pages',
    icon: 'mdi-pencil-outline',
    keywords: 'path url',
    run: host.renameCurrentPage,
  })
  add({
    id: 'page:duplicate',
    title: 'Duplicate page',
    subtitle: store.activePage.name,
    group: 'Pages',
    icon: 'mdi-content-copy',
    keywords: 'copy clone',
    run: () => store.duplicatePage(store.activePage.id),
  })
  if (store.pages.length > 1) {
    add({
      id: 'page:delete',
      title: 'Delete page',
      subtitle: store.activePage.name,
      group: 'Pages',
      icon: 'mdi-delete-outline',
      keywords: 'remove',
      run: () => store.deletePage(store.activePage.id),
    })
  }
  if (store.editingLayout) {
    add({
      id: 'layout:back',
      title: 'Back to page',
      group: 'Pages',
      icon: 'mdi-arrow-left',
      keywords: 'layout leave',
      run: () => store.selectPage(store.activePage.id),
    })
  } else {
    add({
      id: 'layout:edit',
      title: store.project.layout ? 'Edit shared layout' : 'Create shared layout',
      group: 'Pages',
      icon: 'mdi-page-layout-header-footer',
      keywords: 'app bar navigation drawer header menu',
      run: () => store.editLayout(true),
    })
  }

  // ─── Projects ──────────────────────────────────────────────────────────────
  add({
    id: 'project:all',
    title: 'All projects…',
    group: 'Projects',
    icon: 'mdi-folder-multiple-outline',
    keywords: 'open switch rename duplicate delete export project',
    run: host.openProjects,
  })
  add({
    id: 'project:new',
    title: 'New project…',
    group: 'Projects',
    icon: 'mdi-folder-plus-outline',
    keywords: 'add create project',
    run: host.newProject,
  })

  // ─── Editor ────────────────────────────────────────────────────────────────
  add({
    id: 'editor:preview',
    title: 'Preview',
    group: 'Editor',
    icon: 'mdi-eye-outline',
    keywords: 'run test play',
    run: () => {
      store.isPreviewMode = true
    },
  })
  if (store.canUndo)
    add({
      id: 'editor:undo',
      title: 'Undo',
      group: 'Editor',
      icon: 'mdi-undo',
      shortcut: `${mod} Z`,
      run: () => store.undo(),
    })
  if (store.canRedo)
    add({
      id: 'editor:redo',
      title: 'Redo',
      group: 'Editor',
      icon: 'mdi-redo',
      shortcut: `${mod} Shift Z`,
      run: () => store.redo(),
    })
  add({
    id: 'editor:layers',
    title: 'Show or hide the left panel',
    group: 'Editor',
    icon: 'mdi-view-list-outline',
    keywords: 'layers components sidebar',
    run: () => host.toggleLayersPanel(),
  })
  add({
    id: 'editor:properties',
    title: 'Show or hide Properties',
    group: 'Editor',
    icon: 'mdi-tune-variant',
    keywords: 'inspector right panel',
    run: () => host.toggleProperties(),
  })
  add({
    id: 'editor:export',
    title: 'Export project',
    group: 'Editor',
    icon: 'mdi-export',
    keywords: 'download backup save json',
    run: host.exportProject,
  })
  add({
    id: 'editor:import',
    title: 'Import project…',
    group: 'Editor',
    icon: 'mdi-import',
    keywords: 'upload restore open json',
    run: host.importProject,
  })
  add({
    id: 'editor:focus',
    title: 'Focus mode: show only the canvas',
    group: 'Editor',
    icon: 'mdi-arrow-expand-all',
    shortcut: `${mod} \\`,
    keywords: 'hide panels sidebar distraction full screen zen',
    run: host.toggleFocus,
  })
  add({
    id: 'editor:tour',
    title: 'Show the quick tour',
    group: 'Editor',
    icon: 'mdi-compass-outline',
    keywords: 'help guide onboarding hints start',
    run: host.startTour,
  })
  add({
    id: 'editor:behavior-guide',
    title: 'Open the Behavior guide',
    group: 'Editor',
    icon: 'mdi-book-open-variant',
    keywords: 'help documentation tutorial conditions v-if v-for v-model click variables expressions',
    run: host.openBehaviorGuide,
  })
  add({
    id: 'editor:export-code',
    title: 'Export code (Vue files)',
    group: 'Editor',
    icon: 'mdi-code-tags',
    keywords: 'download copy vue sfc source generate page component layout',
    run: host.openCodeExport,
  })
  add({
    id: 'editor:theme',
    title: 'Theme settings',
    group: 'Editor',
    icon: 'mdi-palette-swatch-outline',
    keywords: 'colors colours dark light mode radius density corners brand primary style appearance',
    run: host.openThemeSettings,
  })
  add({
    id: 'editor:structure-graph',
    title: 'Open the structure graph',
    group: 'Editor',
    icon: 'mdi-graph-outline',
    keywords: 'tree outline structure diagram nodes pages components layers overview map',
    run: host.openStructureGraph,
  })

  // ─── Add a component ───────────────────────────────────────────────────────
  for (const def of PALETTE_COMPONENTS) {
    add({
      id: `add:${def.type}`,
      title: `Add ${def.label}`,
      subtitle: getComponentCategory(def.type),
      group: 'Add component',
      icon: def.treeIcon,
      keywords: `${def.type} new insert create`,
      run: () => store.addComponent(def.type),
    })
  }

  // ─── Starter templates ─────────────────────────────────────────────────────
  for (const template of TEMPLATES) {
    add({
      id: `template:${template.kind}`,
      title: `Add template: ${template.label}`,
      subtitle: template.description,
      group: 'Templates',
      icon: template.icon,
      keywords: 'starter page layout example',
      run: () => host.addTemplate(template.kind),
    })
  }

  // ─── Jump to an element of this page ───────────────────────────────────────
  for (const { node, parent } of elements(store.rootNode)) {
    add({
      id: `el:${node.id}`,
      title: `Select ${node.name}`,
      subtitle: `${getComponentDef(node.type)?.label ?? node.type} in ${store.nodeLabel(parent)}`,
      group: 'Elements',
      icon: getComponentDef(node.type)?.treeIcon ?? 'mdi-shape-outline',
      keywords: `find jump go layer ${node.type}`,
      run: () => store.selectNode(node.id),
    })
  }
  return commands
}
