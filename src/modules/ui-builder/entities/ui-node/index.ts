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
export { BEHAVIOR_ICONS } from './model/behaviorIcons'
export { explainHiddenElements, valueToText } from './model/hiddenExplanation'
export type { HiddenElement } from './model/hiddenExplanation'
export { isNodeEmpty } from './model/nodeUtils'
export { isCurrentSection, openSection, selectInSection } from './model/outlineNavigation'
export { buildOutline, OutlineKind, outlineToText, outlineToTextAll } from './model/structureOutline'
export type { OutlineNode, OutlineSection } from './model/structureOutline'
export { conditionVariables, repeatScopeNames, StartingOutcome, startingOutcome } from './model/conditionOutcome'
export type { BehaviorNote } from './model/behaviorSummary'
export { exportLayout, exportPage, exportPrefab } from './model/vueExport'
export type { VueFile } from './model/vueExport'
export { useUiTreeStore } from './model/store'
export { emptyProjectDocument } from './model/document'
export type { OpenedProject, ProjectStorage } from './model/persistence'
export { columnKeyError, tableColumns, tableRows } from './model/tableMutations'
export { TEMPLATES } from './model/templateFactory'
export {
  defaultTemplateProps,
  emptyListEntry,
  TEMPLATE_SETTINGS,
  templateHasSettings,
  TemplateSettingKind,
} from './model/templates/templateSettings'
export { presetTemplateProps, templatePresets } from './model/templates/templatePresets'
export type { TemplatePreset } from './model/templates/templatePresets'
export type { TemplateField, TemplateSetting } from './model/templates/templateSettings'
export type { TemplateProps } from './model/templateFactory'
export type { TextRecord } from './model/templates/templateProps'
export { applyPrefabProps, declarePrefabProps, findPrefabPropNames } from './model/prefabProps'
export type { PrefabPropValues } from './model/prefabProps'
export type { Page, Prefab, PrefabProp, Project, UiAction, UiNode } from './model/types'
export { canvasDragTargetId, default as NodeRenderer } from './ui/NodeRenderer'
export { auditProject } from './model/projectAudit'
export { bindingRoots, findVariableUsages, UsageKind } from './model/variableUsage'
export type { VariableUsage } from './model/variableUsage'
export type { Issue } from './model/projectAudit'
export type { PreviewSnapshot } from './model/previewSnapshot'
