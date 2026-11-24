import { exportLayout, exportPage, exportPrefab, type VueFile } from '../../../entities/ui-node'
import type { Page, Prefab, Project, UiNode } from '../../../entities/ui-node'
import { toPascalCase } from '../../../../../shared/lib/pascalCase'

export enum ExportTargetKind {
  Page = 'page',
  Layout = 'layout',
  Component = 'component',
}

export interface ExportTarget {
  id: string
  kind: ExportTargetKind
  /** The page, layout or component name shown in the list. */
  title: string
  file: VueFile
}

const FALLBACK_NAME: Record<ExportTargetKind, string> = {
  [ExportTargetKind.Page]: 'Page',
  [ExportTargetKind.Layout]: 'AppLayout',
  [ExportTargetKind.Component]: 'Component',
}

/** `OrderDesk.vue`; a second file with the same name becomes `OrderDesk2.vue` so a folder of exports never overwrites itself. */
function uniqueFileName(title: string, kind: ExportTargetKind, taken: Set<string>): string {
  const base = toPascalCase(title) || FALLBACK_NAME[kind]
  let name = base
  for (let copy = 2; taken.has(name); copy++) name = `${base}${copy}`
  taken.add(name)
  return `${name}.vue`
}

/** Everything that can be exported as code: each page, the shared layout and each saved component. */
export function buildExportTargets(project: Project, prefabs: Prefab[]): ExportTarget[] {
  const taken = new Set<string>()
  const targets: ExportTarget[] = []
  const add = (id: string, kind: ExportTargetKind, title: string, build: (fileName: string) => VueFile) =>
    targets.push({ id, kind, title, file: build(uniqueFileName(title, kind, taken)) })

  for (const page of project.pages)
    add(page.id, ExportTargetKind.Page, page.name, name => exportPage(page, project.state, name))
  if (project.layout) {
    const layout: UiNode = project.layout
    add('layout', ExportTargetKind.Layout, 'Shared layout', name => exportLayout(layout, project.state, name))
  }
  for (const prefab of prefabs)
    add(prefab.prefabId, ExportTargetKind.Component, prefab.name, name => exportPrefab(prefab, project.state, name))
  return targets
}

/** What the dialog shows first: the page, layout or component being edited now. */
export function defaultTargetId(editing: { prefab: Prefab | null; layout: boolean; page: Page }): string {
  if (editing.prefab) return editing.prefab.prefabId
  return editing.layout ? 'layout' : editing.page.id
}
