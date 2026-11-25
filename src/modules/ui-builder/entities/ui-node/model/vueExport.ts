import { helperSources, HelperName } from './expressionToJs'
import { jsLiteral } from './jsLiteral'
import { variableNameError } from './projectMutations'
import { AMBIENT_NAMES, variablesOfNode, walkNodes } from './variableUsage'
import type { Page, Prefab, UiNode } from './types'
import { renderNodes, type TemplateContext } from './vueTemplate'

const INDENT = '  '
const STORE_IMPORT = "import { useProjectStore } from '../stores/project'"
const APP_SHELL_TYPE = 'VApp'

/** Where an exported file keeps the project's variables. */
export enum StateSource {
  /** Its own `ref`s: the file works alone. */
  Local = 'local',
  /** The Pinia store of an exported project, so every file sees the same values. */
  Shared = 'shared',
}

export interface VueFile {
  /** Name to save it under, such as `OrderDesk.vue`. */
  fileName: string
  code: string
}

/** Names of the project variables an element tree reads or writes, in order of first use. */
function collectVariables(root: UiNode): string[] {
  return [...new Set([...walkNodes(root)].flatMap(node => variablesOfNode(node).map(reference => reference.name)))]
}

const variableDeclaration = (name: string, state: Record<string, unknown>) =>
  `const ${name} = ref(${jsLiteral(name in state ? state[name] : '', 0)})`

interface ScriptParts {
  variables: string[]
  state: Record<string, unknown>
  helpers: ReadonlySet<HelperName>
  usesRouter: boolean
  source: StateSource
  prefab?: Prefab
}

function renderScript({ variables, state, helpers, usesRouter, source, prefab }: ScriptParts): string {
  const isShared = source === StateSource.Shared && variables.length > 0
  const imports = [
    ...(isShared ? ["import { storeToRefs } from 'pinia'"] : []),
    ...(variables.length && !isShared ? ["import { ref } from 'vue'"] : []),
    ...(usesRouter ? ["import { useRouter } from 'vue-router'"] : []),
    ...(isShared ? [STORE_IMPORT] : []),
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
  if (isShared) sections.push([`const { ${variables.join(', ')} } = storeToRefs(useProjectStore())`])
  else if (variables.length) sections.push(variables.map(name => variableDeclaration(name, state)))
  if (!sections.length) return ''
  return `<script setup>\n${sections.map(section => section.join('\n')).join('\n\n')}\n</script>\n\n`
}

function exportTree(root: UiNode, state: Record<string, unknown>, source: StateSource, prefab?: Prefab): string {
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
    source,
    prefab,
  })
  return `${script}<template>\n${template}\n</template>\n`
}

/** The page as a Vue single-file component. Variables become `ref`s starting from the project's values. */
export function exportPage(
  page: Page,
  state: Record<string, unknown>,
  fileName: string,
  source = StateSource.Local,
): VueFile {
  return { fileName, code: exportTree(page.root, state, source) }
}

/** The shared layout; the place of the page becomes `<RouterView />`. */
export function exportLayout(
  layout: UiNode,
  state: Record<string, unknown>,
  fileName: string,
  source = StateSource.Local,
): VueFile {
  return { fileName, code: exportTree(layout, state, source) }
}

/** A saved component; its parameters (`props.name`) become `props` of the file. */
export function exportPrefab(
  prefab: Prefab,
  state: Record<string, unknown>,
  fileName: string,
  source = StateSource.Local,
): VueFile {
  return { fileName, code: exportTree(prefab.node, state, source, prefab) }
}

/** Variables of a project that exported code cannot declare. */
export function unusableVariableNames(roots: UiNode[], state: Record<string, unknown>): string[] {
  const names = new Set([...Object.keys(state), ...roots.flatMap(collectVariables)])
  return [...names].filter(name => variableNameError(name) !== null)
}

/** The store of an exported project: every variable the files use, or null when they use none. */
export function exportStore(roots: UiNode[], state: Record<string, unknown>): string | null {
  const names = [...new Set([...Object.keys(state), ...roots.flatMap(collectVariables)])]
  if (!names.length) return null
  const declarations = names.map(name => `${INDENT}${variableDeclaration(name, state)}`)
  return [
    "import { defineStore } from 'pinia'",
    "import { ref } from 'vue'",
    '',
    '/** The variables shared by every page. */',
    "export const useProjectStore = defineStore('project', () => {",
    ...declarations,
    `${INDENT}return { ${names.join(', ')} }`,
    '})',
    '',
  ].join('\n')
}

/** Whether a layout brings its own `VApp`, so the application must not add another around it. */
export const hasAppShell = (layout: UiNode) => [...walkNodes(layout)].some(node => node.type === APP_SHELL_TYPE)
