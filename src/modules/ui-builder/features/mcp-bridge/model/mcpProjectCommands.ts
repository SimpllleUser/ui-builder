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

export interface McpHost {
  projects: McpProjects
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

/** Project commands always run, so an agent can move away from a locked project; editor commands may be refused. */
export async function runMcpCommand(store: Store, host: McpHost, command: string, args: Args = {}) {
  const projectCommand = PROJECT_COMMANDS[command]
  if (projectCommand) return projectCommand(host.projects, args)
  const reason = host.refusal()
  if (reason) throw new Error(reason)
  const result = executeMcpCommand(store, command, args)
  return command === 'get_status' ? { project: host.projects.current(), ...(result as object) } : result
}
