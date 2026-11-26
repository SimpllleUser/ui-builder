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
export { behaviorOf, clickEventOf, hasValidation } from './model/componentBehaviors'
export {
  actionExamples,
  actionFromInput,
  actionLabel,
  createAction,
  isActionType,
  lacksVariable,
  newVariableValue,
} from './model/actions'
export { ROOT_NODE_ID, TEXT_NODE_TYPE } from './model/constants'
export { actionsOf, EVENT_LABELS, eventsFor, MAX_ACTIONS_PER_EVENT, withActions } from './model/events'
export { isRuleType, ruleError, ruleLabel, ruleNeedsValue } from './model/validationRules'
export { formulaError, isComputed, variableNames } from './model/computedVariables'
export { DEFAULT_DELAY_MS, endpointError, MAX_DELAY_MS } from './model/dataSources'
export {
  ActionType,
  Breakpoint,
  ClickEvent,
  IssueKind,
  IssueSeverity,
  PrefabPropType,
  ColumnAlign,
  EventName,
  RuleType,
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
export { childNodes } from './model/treeUtils'
export { isCurrentSection, openSection, selectInSection } from './model/outlineNavigation'
export { buildOutline, OutlineKind, outlineToText, outlineToTextAll } from './model/structureOutline'
export type { OutlineNode, OutlineSection } from './model/structureOutline'
export { conditionVariables, repeatScopeNames, StartingOutcome, startingOutcome } from './model/conditionOutcome'
export type { BehaviorNote } from './model/behaviorSummary'
export {
  exportLayout,
  exportPage,
  exportPrefab,
  exportStore,
  hasAppShell,
  showsMessages,
  StateSource,
  unusableVariableNames,
} from './model/vueExport'
export type { VueFile } from './model/vueExport'
export { useUiTreeStore } from './model/store'
export {
  effectiveStyle,
  hasOverrides,
  patchNodeStyle,
  responsiveStylesheet,
  setOverride,
} from './model/responsiveStyle'
export { BREAKPOINT_MIN_WIDTHS, BREAKPOINT_WIDTHS, BREAKPOINTS, overrideTarget } from './model/breakpoints'
export { COLUMN_PROPS, columnPropFor, columnsForWidth, GRID_COLUMN_TYPE, GRID_COLUMNS } from './model/grid'
export type { ResponsiveStyles } from './model/types'
export {
  appliedStyleClasses,
  hasShareableStyle,
  sharedStyleOf,
  styleClassCssName,
  styleClassNameError,
  styleClassSheet,
} from './model/styleClasses'
export { overriddenUtilities, StyleSource } from './model/utilityOverlap'
export type { OverriddenUtility } from './model/utilityOverlap'
export { openPrefabRepository } from './api/prefabRepository'
export type { PrefabLibrary } from './model/prefabSync'
export { countPages, emptyProjectDocument, normalizeDocument } from './model/document'
export { SaveRejectedError, UnsavedChanges } from './model/persistence'
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
export {
  BooleanText,
  PREFAB_PROP_TYPE_LABELS,
  prefabPropErrors,
  prefabPropNameError,
  prefabPropType,
  prefabValueError,
  prefabValuesError,
} from './model/prefabParameters'
export type { PrefabPropErrors } from './model/prefabParameters'
export type {
  DataSource,
  InstanceLink,
  Page,
  Prefab,
  PrefabProp,
  Project,
  StyleClasses,
  UiAction,
  UiNode,
  UiNodeEvents,
  ValidationRule,
} from './model/types'
export { canvasDragTargetId, default as NodeRenderer } from './ui/NodeRenderer'
export { auditProject } from './model/projectAudit'
export { bindingRoots, findVariableUsages, UsageKind } from './model/variableUsage'
export type { VariableUsage } from './model/variableUsage'
export type { Issue } from './model/projectAudit'
export type { PreviewSnapshot } from './model/previewSnapshot'
