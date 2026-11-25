// Public API of this slice: everything outside it imports from here, never from the files inside.
export { startProjectSession } from './model/startProjectSession'
export { createProjectSession, LAST_PROJECT_KEY } from './model/projectSession'
export type { ProjectDetails, ProjectSession } from './model/projectSession'
