import { executeMcpCommand } from './mcpCommands'
import type { Args, Store } from './mcpCommandUtils'

export interface McpProject {
  id: string
  name: string
}

export interface McpOpenedProject extends McpProject {
  /** Another tab edits it, so editor commands are refused here until the person takes it over. */
  lockedElsewhere: boolean
}

/** What the bridge needs to know about projects. The application provides it: this slice cannot reach them itself. */
export interface McpProjects {
  current(): McpProject | null
  list(): Promise<McpProject[]>
  create(name: string): Promise<McpOpenedProject>
  open(id: string): Promise<McpOpenedProject>
  rename(id: string, name: string): Promise<void>
}

/** The theme of the open project, also provided by the application. */
export interface McpTheme {
  /** The settings in use and what each of them accepts. */
  describe(): unknown
  /** Changes the settings named; throws for one the theme does not have. */
  change(patch: Record<string, unknown>): unknown
}

export interface McpHost {
  projects: McpProjects
  theme: McpTheme
  /** The open project as a file, theme included. */
  exportFile(): Promise<string>
  /** Takes over the theme of an imported file, when it has one. */
  applyFileTheme(text: string): void
  /** Why the editor cannot be changed now, or null when it can. */
  refusal(): string | null
}

async function findProject(projects: McpProjects, reference: unknown): Promise<McpProject> {
  const all = await projects.list()
  const found = all.find(project => project.id === reference) ?? all.find(project => project.name === reference)
  if (!found) throw new Error(`No project ${String(reference)} (see list_projects).`)
  return found
}

const PROJECT_COMMANDS: Record<string, (projects: McpProjects, args: Args) => Promise<unknown>> = {
  list_projects: async projects => ({ current: projects.current()?.id ?? null, projects: await projects.list() }),
  create_project: (projects, a) => projects.create(String(a.name ?? '')),
  open_project: async (projects, a) => projects.open((await findProject(projects, a.id)).id),
  rename_project: async (projects, a) => {
    const { id } = await findProject(projects, a.id)
    await projects.rename(id, String(a.name ?? ''))
    return { id, name: String(a.name).trim() }
  },
}

export const PROJECT_COMMAND_NAMES = Object.keys(PROJECT_COMMANDS)

/** What the server needs to picture the project: the file, the page, and where a running Preview stands. */
async function screenshotSource(store: Store, host: McpHost, args: Args) {
  if (store.editingPrefab) throw new Error('Screenshots show pages. Call close_saved_component first.')
  const shown = store.isPreviewMode ? store.previewPage : store.activePage
  const path = args.path === undefined ? shown.path : String(args.path)
  if (!store.pages.some(page => page.path === path)) throw new Error(`No page with path ${path}.`)
  const state = store.isPreviewMode ? store.runtimeState : null
  return { document: await host.exportFile(), path, state }
}

/** Project commands always run, so an agent can move away from a locked project; editor commands may be refused. */
export async function runMcpCommand(store: Store, host: McpHost, command: string, args: Args = {}) {
  const projectCommand = PROJECT_COMMANDS[command]
  if (projectCommand) return projectCommand(host.projects, args)
  const reason = host.refusal()
  if (reason) throw new Error(reason)
  if (command === 'export_document') return host.exportFile()
  if (command === 'screenshot_source') return screenshotSource(store, host, args)
  if (command === 'get_theme') return host.theme.describe()
  if (command === 'set_theme') return host.theme.change(args.settings ?? {})
  const result = executeMcpCommand(store, command, args)
  if (command === 'import_document') host.applyFileTheme(String(args.json))
  return command === 'get_status' ? { project: host.projects.current(), ...(result as object) } : result
}
