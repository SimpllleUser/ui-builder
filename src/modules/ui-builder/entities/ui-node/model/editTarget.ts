/** The tree the editor is working on. There is always exactly one. */
export enum EditTargetKind {
  Page = 'page',
  Layout = 'layout',
  Prefab = 'prefab',
}

export type EditTarget =
  | { kind: EditTargetKind.Page }
  | { kind: EditTargetKind.Layout }
  /** A saved component is opened on top of a page or the layout, and leaving it goes back there. */
  | { kind: EditTargetKind.Prefab; prefabId: string; returnsToLayout: boolean }

export const PAGE_TARGET: EditTarget = { kind: EditTargetKind.Page }
export const LAYOUT_TARGET: EditTarget = { kind: EditTargetKind.Layout }

/** Whether the shared layout is being edited, or is what leaving the saved component goes back to. */
export const isOnLayout = (target: EditTarget) =>
  target.kind === EditTargetKind.Prefab ? target.returnsToLayout : target.kind === EditTargetKind.Layout

export const editedPrefabId = (target: EditTarget) => (target.kind === EditTargetKind.Prefab ? target.prefabId : null)

export const openPrefabTarget = (current: EditTarget, prefabId: string): EditTarget => ({
  kind: EditTargetKind.Prefab,
  prefabId,
  returnsToLayout: isOnLayout(current),
})

/** Back to the page or layout under a saved component; any other target stays as it is. */
export const leavePrefabTarget = (current: EditTarget): EditTarget =>
  current.kind !== EditTargetKind.Prefab ? current : current.returnsToLayout ? LAYOUT_TARGET : PAGE_TARGET

/** For a project that no longer has a shared layout. */
export const withoutLayout = (current: EditTarget): EditTarget => {
  if (current.kind === EditTargetKind.Layout) return PAGE_TARGET
  return current.kind === EditTargetKind.Prefab ? { ...current, returnsToLayout: false } : current
}
