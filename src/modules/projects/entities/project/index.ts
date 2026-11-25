// Public API of this slice: everything outside it imports from here, never from the files inside.
export { openProjectRepository } from './api/projectRepository'
export type { ProjectRepository } from './api/projectRepository'
export { LEGACY_PROJECT_NAME, migrateLegacyProject } from './model/migrateLegacyProject'
export type { LegacyStorage } from './model/migrateLegacyProject'
export { MAX_PROJECT_NAME_LENGTH, projectNameError, uniqueProjectName } from './model/projectName'
export type { NewProject, ProjectCheckpoint, ProjectMeta, ProjectPreferences } from './model/types'
