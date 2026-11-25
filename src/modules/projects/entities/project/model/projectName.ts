import type { ProjectMeta } from './types'

export const MAX_PROJECT_NAME_LENGTH = 60

/** Why `name` cannot name a project, or null when it can. `ownId` is the project that already has it. */
export function projectNameError(projects: ProjectMeta[], name: string, ownId?: string): string | null {
  const wanted = name.trim().toLowerCase()
  if (!wanted) return 'Enter a name.'
  if (wanted.length > MAX_PROJECT_NAME_LENGTH) return `Use at most ${MAX_PROJECT_NAME_LENGTH} characters.`
  const taken = projects.some(project => project.id !== ownId && project.name.toLowerCase() === wanted)
  return taken ? 'Another project already has this name.' : null
}

/** `name`, or `name 2`, `name 3`… when it is taken. Used when the app, not the person, chooses the name. */
export function uniqueProjectName(projects: ProjectMeta[], name: string): string {
  const base = name.trim().slice(0, MAX_PROJECT_NAME_LENGTH) || 'Untitled project'
  let candidate = base
  for (let number = 2; projectNameError(projects, candidate); number++) {
    const suffix = ` ${number}`
    candidate = `${base.slice(0, MAX_PROJECT_NAME_LENGTH - suffix.length)}${suffix}`
  }
  return candidate
}
