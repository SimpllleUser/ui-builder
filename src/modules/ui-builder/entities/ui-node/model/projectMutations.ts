import { MAX_PAGES } from './constants'
import { defaultLayout, emptyPage } from './document'
import { isValidPagePath } from './documentValidator'
import type { Page, Project, UiNode } from './types'

const INVALID_PATH_MESSAGE = 'Use a path like /orders (letters, digits, - and _).'
const STATE_NAME = /^[A-Za-z_$][\w$]*$/
const RESERVED_STATE_NAMES = ['__proto__', 'constructor', 'prototype']

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

const slugify = (name: string) => `/${name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}`

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
  if (!isValidPagePath(wanted)) { context.setNotice(INVALID_PATH_MESSAGE); return null }
  if (explicitPath && isPathTaken(project, wanted)) { context.setNotice(`A page already uses ${wanted}.`); return null }

  const page = emptyPage(trimmedName, uniquePath(project, wanted === '/' ? '/page' : wanted))
  undoable(context, () => project.pages.push(page))
  selectPage(context, page.id)
  return page
}

export function updatePage(context: ProjectMutationContext, id: string, patch: { name?: string; path?: string }): boolean {
  const { project } = context
  const page = project.pages.find(item => item.id === id)
  if (!page) return false

  const name = patch.name?.trim()
  const path = patch.path?.trim()
  if (path !== undefined && (!isValidPagePath(path) || isPathTaken(project, path, id))) {
    context.setNotice(isValidPagePath(path) ? `A page already uses ${path}.` : INVALID_PATH_MESSAGE)
    return false
  }
  undoable(context, () => {
    if (name) page.name = name
    if (path !== undefined) page.path = path
  })
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
  if (!STATE_NAME.test(name) || RESERVED_STATE_NAMES.includes(name)) {
    context.setNotice('State names use letters, digits and _, and cannot start with a digit.')
    return false
  }
  undoable(context, () => { context.project.state[name] = value })
  return true
}

export function removeStateVariable(context: ProjectMutationContext, name: string) {
  undoable(context, () => { delete context.project.state[name] })
}
