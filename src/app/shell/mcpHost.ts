import type { McpHost, McpProjects, McpTheme } from '../../modules/ui-builder/features/mcp-bridge'
import type { ProjectSession } from '../../modules/projects/features/manage-projects'

const LOCKED = 'This tab does not edit the project: it is open in another tab. Open another project with open_project.'

/** Gives the MCP bridge the projects of this tab. */
export function createMcpHost(session: ProjectSession, lastNotice: () => string, theme: McpTheme): McpHost {
  const current = () => {
    const project = session.currentProject.value
    return project ? { id: project.id, name: project.name } : null
  }
  const opened = (succeeded: boolean) => {
    const project = current()
    if (!succeeded || !project) throw new Error(lastNotice() || 'Could not open the project.')
    return { ...project, lockedElsewhere: session.isLocked.value }
  }
  const projects: McpProjects = {
    current,
    list: async () => {
      await session.refresh()
      return session.projects.value.map(({ id, name }) => ({ id, name }))
    },
    create: async name => opened(await session.create(name)),
    open: async id => opened(await session.open(id)),
    rename: (id, name) => session.rename(id, name),
  }
  return {
    projects,
    theme,
    refusal: () => (session.isLocked.value ? LOCKED : null),
    exportFile: () => session.exportFile(session.currentProjectId.value ?? ''),
    applyFileTheme: session.applyFileTheme,
  }
}
