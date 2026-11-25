export class ProjectMissingError extends Error {
  constructor() {
    super('This project no longer exists.')
  }
}

/** The document was written by someone else since it was read. */
export class ProjectChangedError extends Error {
  constructor() {
    super('This project was changed somewhere else.')
  }
}
