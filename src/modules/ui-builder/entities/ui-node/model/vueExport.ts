import { TEXT_NODE_TYPE } from './constants'
import { expressionError, expressionVariables } from './expression'
import { helperSources, HelperName } from './expressionToJs'
import { jsLiteral } from './jsLiteral'
import { AMBIENT_NAMES, bindingRoots } from './projectAudit'
import type { Page, Prefab, UiNode } from './types'
import { renderNodes, type TemplateContext } from './vueTemplate'

const INDENT = '  '
const ROOT_NAME = /^\s*([A-Za-z_$][\w$]*)/

export interface VueFile {
  /** Name to save it under, such as `OrderDesk.vue`. */
  fileName: string
  code: string
}

function childNodes(node: UiNode): UiNode[] {
  return [...node.children, ...Object.values(node.slots).flat()]
}

/** Names of the project variables an element tree reads or writes, in order of first use. */
function collectVariables(root: UiNode): string[] {
  const names = new Set<string>()
  const add = (name: string | undefined) => {
    if (name && !AMBIENT_NAMES.has(name)) names.add(name)
  }
  const addFromText = (text: string) => bindingRoots(text).forEach(add)
  const visit = (node: UiNode) => {
    if (node.type === TEXT_NODE_TYPE) addFromText(node.name)
    for (const value of Object.values(node.props)) if (typeof value === 'string') addFromText(value)
    add(node.model)
    if (node.vFor) add(ROOT_NAME.exec(node.vFor)?.[1])
    if (node.vIf && !expressionError(node.vIf)) expressionVariables(node.vIf).forEach(add)
    const click = node.events?.click
    if (click && 'key' in click) add(click.key)
    if (click && 'to' in click) addFromText(click.to)
    if (click && 'value' in click) addFromText(click.value)
    childNodes(node).forEach(visit)
  }
  visit(root)
  return [...names]
}

const variableDeclaration = (name: string, state: Record<string, unknown>) =>
  `const ${name} = ref(${jsLiteral(name in state ? state[name] : '', 0)})`

interface ScriptParts {
  variables: string[]
  state: Record<string, unknown>
  helpers: ReadonlySet<HelperName>
  usesRouter: boolean
  prefab?: Prefab
}

function renderScript({ variables, state, helpers, usesRouter, prefab }: ScriptParts): string {
  const imports = [
    ...(variables.length ? ["import { ref } from 'vue'"] : []),
    ...(usesRouter ? ["import { useRouter } from 'vue-router'"] : []),
  ]
  const sections: string[][] = []
  if (imports.length) sections.push(imports)
  if (prefab?.props?.length) {
    const declared = prefab.props.map(
      ({ name, defaultValue }) => `${INDENT}${name}: { type: String, default: ${jsLiteral(defaultValue)} },`,
    )
    sections.push(['const props = defineProps({', ...declared, '})'])
  }
  if (usesRouter) sections.push(['const router = useRouter()'])
  if (helpers.size) sections.push(helperSources(helpers))
  if (variables.length) sections.push(variables.map(name => variableDeclaration(name, state)))
  if (!sections.length) return ''
  return `<script setup>\n${sections.map(section => section.join('\n')).join('\n\n')}\n</script>\n\n`
}

function exportTree(root: UiNode, state: Record<string, unknown>, prefab?: Prefab): string {
  const variables = collectVariables(root)
  const context: TemplateContext = {
    known: new Set([...Object.keys(state), ...variables, ...AMBIENT_NAMES]),
    helpers: new Set(),
    usage: { router: false },
  }
  const template = renderNodes([root], context, 1).join('\n')
  const script = renderScript({
    variables,
    state,
    helpers: context.helpers,
    usesRouter: context.usage.router,
    prefab,
  })
  return `${script}<template>\n${template}\n</template>\n`
}

/** The page as a Vue single-file component. Variables become `ref`s starting from the project's values. */
export function exportPage(page: Page, state: Record<string, unknown>, fileName: string): VueFile {
  return { fileName, code: exportTree(page.root, state) }
}

/** The shared layout; the place of the page becomes `<RouterView />`. */
export function exportLayout(layout: UiNode, state: Record<string, unknown>, fileName: string): VueFile {
  return { fileName, code: exportTree(layout, state) }
}

/** A saved component; its parameters (`props.name`) become `props` of the file. */
export function exportPrefab(prefab: Prefab, state: Record<string, unknown>, fileName: string): VueFile {
  return { fileName, code: exportTree(prefab.node, state, prefab) }
}
