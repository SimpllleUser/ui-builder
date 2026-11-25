import { actionProblem } from './actions'
import { behaviorOf } from './componentBehaviors'
import { OUTLET_NODE_TYPE, TEXT_NODE_TYPE } from './constants'
import { IssueKind, IssueSeverity } from './enums'
import { variableNameError } from './projectMutations'
import { conditionError } from './runtime'
import type { Project, UiNode } from './types'
import { isNodeEmpty } from './nodeUtils'
import { walkNodes } from './treeUtils'
import { UsageKind, variablesOfNode, walkProject, type ProjectNode } from './variableUsage'

export { AMBIENT_NAMES, bindingRoots } from './variableUsage'

export interface Issue {
  kind: IssueKind
  severity: IssueSeverity
  message: string
  pageId?: string
  nodeId?: string
  nodeName?: string
}

/** How seriously an unknown variable counts, by where it is used: a missing one in text only shows nothing. */
const UNKNOWN_SEVERITY: Record<UsageKind, IssueSeverity> = {
  [UsageKind.Text]: IssueSeverity.Warning,
  [UsageKind.Property]: IssueSeverity.Warning,
  [UsageKind.Link]: IssueSeverity.Error,
  [UsageKind.Repeat]: IssueSeverity.Error,
  [UsageKind.Condition]: IssueSeverity.Error,
  [UsageKind.Click]: IssueSeverity.Error,
}
const USAGE_SUFFIX: Record<UsageKind, string> = {
  [UsageKind.Text]: '',
  [UsageKind.Property]: '',
  [UsageKind.Link]: ' (link to a variable)',
  [UsageKind.Repeat]: ' (repeat)',
  [UsageKind.Condition]: ' (show only when)',
  [UsageKind.Click]: ' (click)',
}

/** Problems that would make a project misbehave in Preview, found without running it. */
export function auditProject(project: Project): Issue[] {
  const issues: Issue[] = []
  const defined = new Set(Object.keys(project.state))
  const used = new Set<string>()
  const routes = new Set(project.pages.map(page => page.path))

  const report = (issue: Omit<Issue, 'nodeName'> & { node?: UiNode }) => {
    const { node, ...rest } = issue
    issues.push({ ...rest, ...(node ? { nodeId: node.id, nodeName: node.name } : {}) })
  }
  const useVariable = (name: string, severity: IssueSeverity, walked: ProjectNode, where: string) => {
    used.add(name)
    if (!defined.has(name)) {
      report({
        kind: IssueKind.UnknownVariable,
        severity,
        message: `${where} uses the variable “${name}”, which is not defined. Add it with set_state.`,
        pageId: walked.pageId,
        node: walked.node,
      })
    }
  }

  for (const walked of walkProject(project)) {
    const { node, pageId } = walked
    const here = node.type === TEXT_NODE_TYPE ? `The text “${node.name.slice(0, 30)}”` : `“${node.name}”`

    for (const reference of variablesOfNode(node))
      useVariable(reference.name, UNKNOWN_SEVERITY[reference.kind], walked, `${here}${USAGE_SUFFIX[reference.kind]}`)
    if (node.vIf) {
      const problem = conditionError(node.vIf)
      if (problem) {
        report({
          kind: IssueKind.InvalidCondition,
          severity: IssueSeverity.Error,
          message: `${here}: ${problem}`,
          pageId,
          node,
        })
      }
    }

    const click = node.events?.click
    const broken = click && actionProblem(click, routes)
    if (broken) {
      report({
        kind: broken.kind,
        severity: IssueSeverity.Error,
        message: `${here} ${broken.predicate}`,
        pageId,
        node,
      })
    }

    for (const { kind, severity, predicate } of behaviorOf(node.type).problems?.(node) ?? [])
      report({ kind, severity, message: `${here} ${predicate}`, pageId, node })
  }

  if (project.layout && ![...walkNodes(project.layout)].some(node => node.type === OUTLET_NODE_TYPE)) {
    report({
      kind: IssueKind.MissingOutlet,
      severity: IssueSeverity.Warning,
      message: 'The shared layout has no “Page content” element, so no page will show inside it.',
    })
  }
  for (const page of project.pages) {
    if (isNodeEmpty(page.root)) {
      report({
        kind: IssueKind.EmptyPage,
        severity: IssueSeverity.Info,
        message: `The page “${page.name}” is empty.`,
        pageId: page.id,
      })
    }
  }
  for (const name of new Set([...defined, ...used])) {
    if (variableNameError(name)) {
      report({
        kind: IssueKind.UnusableName,
        severity: IssueSeverity.Error,
        message: `The variable “${name}” has a name that exported code cannot use. Rename it.`,
      })
    }
  }
  for (const name of defined) {
    if (!used.has(name)) {
      report({
        kind: IssueKind.UnusedVariable,
        severity: IssueSeverity.Info,
        message: `The variable “${name}” is defined but nothing uses it.`,
      })
    }
  }
  return issues
}
