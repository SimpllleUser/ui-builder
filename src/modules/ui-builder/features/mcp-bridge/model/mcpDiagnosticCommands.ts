import { IssueSeverity, auditProject } from '../../../entities/ui-node'
import type { McpCommand } from './mcpCommandUtils'

export const MCP_DIAGNOSTIC_COMMANDS: Record<string, McpCommand> = {
  /** Problems that would break the page in Preview, found without running it. */
  check_project: store => {
    const issues = auditProject(store.project)
    const count = (severity: IssueSeverity) => issues.filter(issue => issue.severity === severity).length
    return {
      ok: count(IssueSeverity.Error) === 0,
      errors: count(IssueSeverity.Error),
      warnings: count(IssueSeverity.Warning),
      info: count(IssueSeverity.Info),
      issues,
    }
  },

  // ─── Trying the page in Preview ────────────────────────────────────────────
  preview_start: store => {
    store.startPreview()
    return store.describePreview()
  },
  preview_stop: store => {
    store.isPreviewMode = false
    return { previewing: false }
  },
  preview_state: store => {
    if (!store.isPreviewMode) throw new Error('Preview is not running. Call preview_start first.')
    return store.describePreview()
  },
  preview_click: (store, a) => {
    store.previewClick(String(a.id), a.row, a.copy)
    return store.describePreview()
  },
  preview_submit: (store, a) => {
    const errors = store.previewSubmit(String(a.id), a.copy)
    return { submitted: !errors.length, errors, ...store.describePreview() }
  },
  preview_input: (store, a) => {
    store.previewInput(String(a.id), a.value, a.copy)
    return store.describePreview()
  },
  preview_navigate: (store, a) => {
    if (!store.isPreviewMode) throw new Error('Preview is not running. Call preview_start first.')
    store.navigate(String(a.path))
    return store.describePreview()
  },
  preview_reset: store => {
    if (!store.isPreviewMode) throw new Error('Preview is not running. Call preview_start first.')
    store.resetPreview()
    return store.describePreview()
  },
}
