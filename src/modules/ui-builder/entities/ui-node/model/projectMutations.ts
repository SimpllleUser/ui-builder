import type { StepDirection } from './enums'
import { RESERVED_NAMES } from './reservedNames'
import { MAX_PAGES } from './constants'
import { defaultLayout, emptyPage } from './document'
import { isValidPagePath } from './documentValidator'
import { formulaError } from './computedVariables'
import { endpointError, MAX_DELAY_MS } from './dataSources'
import { cloneNodeWithNewIds } from './nodeUtils'
import type { DataSource, Page, Project, UiNode } from './types'

const STATE_NAME = /^[A-Za-z_$][\w$]*$/

/** Why `path` cannot be a page's route, or null when it can. `own` is the page that already has it. */
export function pagePathError(pages: Page[], path: string, ownPageId?: string): string | null {
  if (!isValidPagePath(path)) return 'Use a route like /orders (letters, digits, - and _).'
  if (pages.some(page => page.path === path && page.id !== ownPageId)) return 'Another page already uses this route.'
  return null
}

/** Why `name` cannot name a variable, or null when it can. */
export function variableNameError(name: string): string | null {
  if (!name) return 'Enter a name.'
  if (RESERVED_NAMES.has(name)) return 'This name is reserved. Choose another.'
  if (!STATE_NAME.test(name)) return 'Use letters, digits and _, and do not start with a digit.'
  return null
}

export interface ProjectMutationContext {
  project: Project
  getActivePageId(): string
  setActivePageId(id: string): void
  setEditingLayout(editing: boolean): void
  clearSelection(): void
  commit(): void
  setNotice(message: string): void
  createNode(type: string, name?: string): UiNode
}

const slugify = (name: string) =>
  `/${name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')}`

const isPathTaken = (project: Project, path: string, exceptPageId?: string) =>
  project.pages.some(page => page.path === path && page.id !== exceptPageId)

function uniquePath(project: Project, wanted: string) {
  let path = wanted
  for (let n = 2; isPathTaken(project, path); n++) path = `${wanted}-${n}`
  return path
}

/** Runs `change` as one undoable step. */
function undoable(context: ProjectMutationContext, change: () => void) {
  context.commit()
  change()
  context.commit()
}

export function selectPage(context: ProjectMutationContext, id: string): boolean {
  if (!context.project.pages.some(page => page.id === id)) return false
  context.commit()
  context.setActivePageId(id)
  context.setEditingLayout(false)
  context.clearSelection()
  return true
}

export function addPage(context: ProjectMutationContext, name: string, path?: string): Page | null {
  const { project } = context
  const trimmedName = name.trim()
  if (!trimmedName || project.pages.length >= MAX_PAGES) return null

  const explicitPath = path?.trim()
  const wanted = explicitPath || slugify(trimmedName)
  // A route made from the name is adjusted to be free; one the person typed must be right as it is.
  const pathError = explicitPath
    ? pagePathError(project.pages, wanted)
    : isValidPagePath(wanted)
      ? null
      : pagePathError([], wanted)
  if (pathError) {
    context.setNotice(`Route ${wanted}: ${pathError}`)
    return null
  }

  const page = emptyPage(trimmedName, uniquePath(project, wanted === '/' ? '/page' : wanted))
  undoable(context, () => project.pages.push(page))
  selectPage(context, page.id)
  return page
}

export function updatePage(
  context: ProjectMutationContext,
  id: string,
  patch: { name?: string; path?: string },
): boolean {
  const { project } = context
  const page = project.pages.find(item => item.id === id)
  if (!page) return false

  const name = patch.name?.trim()
  const path = patch.path?.trim()
  const pathError = path === undefined ? null : pagePathError(project.pages, path, id)
  if (pathError) {
    context.setNotice(`Route ${path}: ${pathError}`)
    return false
  }
  undoable(context, () => {
    if (name) {
      page.name = name
      page.root.name = name
    }
    if (path !== undefined) page.path = path
  })
  return true
}

/** A copy of a page with its own element ids, placed right after the original. */
export function duplicatePage(context: ProjectMutationContext, id: string): Page | null {
  const { project } = context
  const index = project.pages.findIndex(page => page.id === id)
  if (index < 0 || project.pages.length >= MAX_PAGES) return null

  const source = project.pages[index]
  const name = `${source.name} copy`
  const copy: Page = {
    ...emptyPage(name, uniquePath(project, `${source.path === '/' ? '/page' : source.path}-copy`)),
    // The root keeps its fixed id; everything inside gets new ids.
    root: { ...cloneNodeWithNewIds(source.root), id: source.root.id, name },
  }
  undoable(context, () => project.pages.splice(index + 1, 0, copy))
  selectPage(context, copy.id)
  return copy
}

/** Moves a page one place left (-1) or right (1) in the tab order. */
export function movePage(context: ProjectMutationContext, id: string, direction: StepDirection): boolean {
  const { pages } = context.project
  const from = pages.findIndex(page => page.id === id)
  const to = from + direction
  if (from < 0 || to < 0 || to >= pages.length) return false
  undoable(context, () => pages.splice(to, 0, ...pages.splice(from, 1)))
  return true
}

export function deletePage(context: ProjectMutationContext, id: string): boolean {
  const { project } = context
  if (project.pages.length < 2 || !project.pages.some(page => page.id === id)) return false
  undoable(context, () => {
    project.pages = project.pages.filter(page => page.id !== id)
    if (context.getActivePageId() === id) context.setActivePageId(project.pages[0].id)
    context.clearSelection()
  })
  return true
}

/** Switches between editing the shared layout and the active page. The layout is created on first use. */
export function editLayout(context: ProjectMutationContext, on: boolean) {
  undoable(context, () => {
    if (on && !context.project.layout) context.project.layout = defaultLayout(context.createNode)
    context.setEditingLayout(on)
    context.clearSelection()
  })
}

export function removeLayout(context: ProjectMutationContext) {
  undoable(context, () => {
    context.project.layout = null
    context.setEditingLayout(false)
    context.clearSelection()
  })
}

export function setStateVariable(context: ProjectMutationContext, name: string, value: unknown): boolean {
  if (Object.hasOwn(context.project.computed ?? {}, name)) {
    context.setNotice(`“${name}” is computed: change its expression instead.`)
    return false
  }
  // A variable saved before its name was refused can still be given a new value.
  const nameError = Object.hasOwn(context.project.state, name) ? null : variableNameError(name)
  if (nameError) {
    context.setNotice(`Variable name: ${nameError}`)
    return false
  }
  undoable(context, () => {
    context.project.state[name] = value
  })
  return true
}

/** Removes an entry and, when it was the last, the whole table, so projects without it stay as they were. */
function dropEntry(project: Project, table: 'computed' | 'sources', name: string) {
  const entries = project[table]
  if (!entries) return
  delete entries[name]
  if (!Object.keys(entries).length) delete project[table]
}

export function removeStateVariable(context: ProjectMutationContext, name: string) {
  undoable(context, () => {
    delete context.project.state[name]
    dropEntry(context.project, 'sources', name)
  })
}

/** Defines or changes a computed variable; null removes it. */
export function setComputed(context: ProjectMutationContext, name: string, formula: string | null): boolean {
  const { project } = context
  if (formula === null) {
    undoable(context, () => dropEntry(project, 'computed', name))
    return true
  }
  const exists = Object.hasOwn(project.computed ?? {}, name)
  const problem =
    (exists ? null : variableNameError(name)) ??
    (Object.hasOwn(project.state, name) ? 'A variable with this name already exists.' : null) ??
    formulaError(name, formula, project.computed)
  if (problem) {
    context.setNotice(`Computed variable ${name}: ${problem}`)
    return false
  }
  undoable(context, () => {
    project.computed = { ...project.computed, [name]: formula.trim() }
  })
  return true
}

/** Loads a variable from a mock endpoint, or stops doing so with null. */
export function setDataSource(context: ProjectMutationContext, name: string, source: DataSource | null): boolean {
  const { project } = context
  if (!source) {
    undoable(context, () => dropEntry(project, 'sources', name))
    return true
  }
  const loading = source.loadingVariable?.trim()
  const problem =
    (Object.hasOwn(project.state, name) ? null : `There is no variable “${name}”.`) ??
    endpointError(source.url) ??
    (loading ? (loading === name ? 'Use another variable for loading.' : variableNameError(loading)) : null)
  if (problem) {
    context.setNotice(`Data source of ${name}: ${problem}`)
    return false
  }
  undoable(context, () => {
    const delayMs = Math.min(MAX_DELAY_MS, Math.max(0, source.delayMs || 0))
    project.sources = {
      ...project.sources,
      [name]: { url: source.url, delayMs, ...(loading ? { loadingVariable: loading } : {}) },
    }
    if (loading && !Object.hasOwn(project.state, loading) && !Object.hasOwn(project.computed ?? {}, loading))
      project.state[loading] = false
  })
  return true
}
