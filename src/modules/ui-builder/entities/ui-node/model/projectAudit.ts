import { OUTLET_NODE_TYPE, TEXT_NODE_TYPE } from './constants'
import { ActionType, IssueKind, IssueSeverity } from './enums'
import { conditionError } from './runtime'
import type { Page, Project, UiNode } from './types'

export interface Issue {
  kind: IssueKind
  severity: IssueSeverity
  message: string
  pageId?: string
  nodeId?: string
  nodeName?: string
}

/** Names that exist inside repeated elements and table cells without being defined as variables. */
const AMBIENT_NAMES = new Set(['item', 'index', 'value'])
const BINDING = /\{\{\s*([^{}]+?)\s*\}\}/g
const ROOT_NAME = /^\s*!?\s*([A-Za-z_$][\w$]*)/

/** The variables a text refers to with `{{ name.path }}`. */
export const bindingRoots = (text: string): string[] =>
  [...text.matchAll(BINDING)].flatMap(match => ROOT_NAME.exec(match[1])?.[1] ?? [])

const rootOf = (expression: string | undefined) => (expression ? ROOT_NAME.exec(expression)?.[1] : undefined)

interface Walk {
  pageId?: string
  node: UiNode
}

function* walk(node: UiNode, pageId?: string): Generator<Walk> {
  yield { pageId, node }
  for (const child of [...node.children, ...Object.values(node.slots).flat()]) yield* walk(child, pageId)
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
  const useVariable = (name: string | undefined, severity: IssueSeverity, walked: Walk, where: string) => {
    if (!name || AMBIENT_NAMES.has(name)) return
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

  const trees: Array<{ root: UiNode; pageId?: string }> = [
    ...project.pages.map((page: Page) => ({ root: page.root, pageId: page.id })),
    ...(project.layout ? [{ root: project.layout }] : []),
  ]
  for (const { root, pageId } of trees) {
    for (const walked of walk(root, pageId)) {
      const { node } = walked
      const here = node.type === TEXT_NODE_TYPE ? `The text “${node.name.slice(0, 30)}”` : `“${node.name}”`

      if (node.type === TEXT_NODE_TYPE)
        bindingRoots(node.name).forEach(name => useVariable(name, IssueSeverity.Warning, walked, here))
      for (const value of Object.values(node.props)) {
        if (typeof value === 'string')
          bindingRoots(value).forEach(name => useVariable(name, IssueSeverity.Warning, walked, here))
      }
      if (node.model) useVariable(node.model, IssueSeverity.Error, walked, `${here} (link to a variable)`)
      if (node.vFor) useVariable(rootOf(node.vFor), IssueSeverity.Error, walked, `${here} (repeat)`)
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
        } else useVariable(rootOf(node.vIf), IssueSeverity.Error, walked, `${here} (show only when)`)
      }

      const click = node.events?.click
      if (click?.type === ActionType.Navigate && !click.to.includes('{{') && !routes.has(click.to)) {
        report({
          kind: IssueKind.MissingRoute,
          severity: IssueSeverity.Error,
          message: `${here} goes to “${click.to}”, but no page has that route.`,
          pageId,
          node,
        })
      }
      if (click && click.type !== ActionType.Navigate)
        useVariable(click.key, IssueSeverity.Error, walked, `${here} (click)`)
      if (click?.type === ActionType.Set)
        bindingRoots(click.value).forEach(name => useVariable(name, IssueSeverity.Error, walked, `${here} (click)`))

      if (node.type === 'VDataTable' && Array.isArray(node.props.headers) && node.props.headers.length === 0) {
        report({
          kind: IssueKind.EmptyTable,
          severity: IssueSeverity.Warning,
          message: `${here} has no columns.`,
          pageId,
          node,
        })
      }
    }
  }

  if (project.layout && ![...walk(project.layout)].some(({ node }) => node.type === OUTLET_NODE_TYPE)) {
    report({
      kind: IssueKind.MissingOutlet,
      severity: IssueSeverity.Warning,
      message: 'The shared layout has no “Page content” element, so no page will show inside it.',
    })
  }
  for (const page of project.pages) {
    if (!page.root.children.length && !Object.values(page.root.slots).some(nodes => nodes.length)) {
      report({
        kind: IssueKind.EmptyPage,
        severity: IssueSeverity.Info,
        message: `The page “${page.name}” is empty.`,
        pageId: page.id,
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
