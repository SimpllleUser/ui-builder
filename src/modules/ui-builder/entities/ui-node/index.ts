// Public API of this slice: everything outside it imports from here, never from the files inside.
export {
  cellSlotName,
  COMPONENT_CATEGORY_ORDER,
  COMPONENT_DEFS,
  getComponentCategory,
  getComponentDef,
  getNodeSlots,
  PALETTE_COMPONENTS,
  WRAP_CONTAINER_TYPES,
} from './model/componentDefinitions'
export type { ComponentDef, PropertySection, PropField } from './model/componentDefinitions'
export { ROOT_NODE_ID, TEXT_NODE_TYPE } from './model/constants'
export {
  ActionType,
  IssueKind,
  IssueSeverity,
  ColumnAlign,
  FieldKind,
  SaveState,
  SpacingType,
  StepDirection,
  TableData,
} from './model/enums'
export type { TemplateKind } from './model/enums'
export { readFlex, readSpacing, writeFlex, writeSpacing } from './model/layoutControls'
export { pagePathError, variableNameError } from './model/projectMutations'
export { describeFields } from './model/propertyFields'
export { conditionError, evaluateCondition, parseLiteral } from './model/runtime'
export { BehaviorBadge, describeBehaviors } from './model/behaviorSummary'
export type { BehaviorNote } from './model/behaviorSummary'
export { exportLayout, exportPage, exportPrefab } from './model/vueExport'
export type { VueFile } from './model/vueExport'
export { useUiTreeStore } from './model/store'
export { columnKeyError, tableColumns, tableRows } from './model/tableMutations'
export { TEMPLATES } from './model/templateFactory'
export { applyPrefabProps, declarePrefabProps, findPrefabPropNames } from './model/prefabProps'
export type { PrefabPropValues } from './model/prefabProps'
export type { Page, Prefab, PrefabProp, Project, UiAction, UiNode } from './model/types'
export { canvasDragTargetId, default as NodeRenderer } from './ui/NodeRenderer'
export { auditProject, bindingRoots } from './model/projectAudit'
export type { Issue } from './model/projectAudit'
export type { PreviewSnapshot } from './model/previewSnapshot'
