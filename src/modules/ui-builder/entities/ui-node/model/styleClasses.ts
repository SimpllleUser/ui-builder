/**
 * Named styles of a project that several elements share. An element uses one through an ordinary CSS class, so the
 * canvas, Preview and exported code only need the matching rules.
 *
 * Which value wins: the element's own style (inline, or the more specific per-screen rules), then a shared class,
 * then Vuetify's utility and theme classes. Everything is `!important`, so specificity decides.
 */
import { markImportant, readStyle, type StyleMap } from '../../../../../shared/lib/inlineStyle'
import { isCssDeclaration } from './responsiveStyle'
import { walkNodes } from './treeUtils'
import type { Project, StyleClasses, UiNode } from './types'

const CSS_CLASS_PREFIX = 'ui-s-'
const STYLE_CLASS_NAME = /^[a-z][a-z0-9-]{0,39}$/

export const styleClassCssName = (name: string) => `${CSS_CLASS_PREFIX}${name}`

export const isStyleClassName = (name: string) => STYLE_CLASS_NAME.test(name)

/** Why a new class cannot get this name, or null when it can. */
export function styleClassNameError(classes: StyleClasses, name: string): string | null {
  if (!name) return 'Enter a name.'
  if (!isStyleClassName(name)) return 'Use small letters, digits and -, starting with a letter (up to 40).'
  if (Object.hasOwn(classes, name)) return 'A class with this name already exists.'
  return null
}

/** The shared classes on an element, in the order their rules are written: a later one wins over an earlier one. */
export const appliedStyleClasses = (node: UiNode, classes: StyleClasses): string[] =>
  Object.keys(classes).filter(name => node.classes.includes(styleClassCssName(name)))

/** What the shared classes of an element set together. */
export const sharedStyleOf = (node: UiNode, classes: StyleClasses): StyleMap =>
  Object.assign({}, ...appliedStyleClasses(node, classes).map(name => classes[name]))

/** The part of an element's own style a class can hold; values with `{{ }}` bindings only the element can fill in. */
function splitOwnStyle(node: UiNode): { shareable: StyleMap; rest: StyleMap } {
  const shareable: StyleMap = {}
  const rest: StyleMap = {}
  for (const [name, value] of Object.entries(readStyle(node.props.style))) {
    if (isCssDeclaration(name, value)) shareable[name] = markImportant(value)
    else rest[name] = value
  }
  return { shareable, rest }
}

export const hasShareableStyle = (node: UiNode) => Object.keys(splitOwnStyle(node).shareable).length > 0

/**
 * Moves the element's own style into the class (making it when it is new) and puts the class on the element,
 * which therefore looks the same as before. False when there is nothing to move.
 */
export function moveStyleToClass(project: Project, node: UiNode, name: string): boolean {
  const { shareable, rest } = splitOwnStyle(node)
  if (!isStyleClassName(name) || !Object.keys(shareable).length) return false
  project.styleClasses = {
    ...project.styleClasses,
    [name]: { ...project.styleClasses?.[name], ...shareable },
  }
  if (Object.keys(rest).length) node.props.style = rest
  else delete node.props.style
  applyStyleClass(node, name)
  return true
}

export function applyStyleClass(node: UiNode, name: string) {
  const cssName = styleClassCssName(name)
  if (!node.classes.includes(cssName)) node.classes = [...node.classes, cssName]
}

export function removeStyleClass(node: UiNode, name: string) {
  node.classes = node.classes.filter(item => item !== styleClassCssName(name))
}

/** Removes the class from the project and from every element of the given trees. */
export function deleteStyleClass(project: Project, roots: UiNode[], name: string): boolean {
  if (!project.styleClasses || !Object.hasOwn(project.styleClasses, name)) return false
  const { [name]: _removed, ...others } = project.styleClasses
  if (Object.keys(others).length) project.styleClasses = others
  else delete project.styleClasses
  for (const root of roots) {
    for (const node of walkNodes(root)) {
      if (node.classes.includes(styleClassCssName(name))) removeStyleClass(node, name)
    }
  }
  return true
}

const kebabCase = (name: string) => name.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)

/** The CSS of the shared classes; with `roots`, only of those their elements use. */
export function styleClassSheet(classes: StyleClasses = {}, roots?: UiNode[]): string {
  const used = roots && new Set(roots.flatMap(root => [...walkNodes(root)].flatMap(node => node.classes)))
  return Object.entries(classes)
    .filter(([name]) => !used || used.has(styleClassCssName(name)))
    .map(([name, style]) => {
      const lines = Object.entries(style)
        .filter(([property, value]) => isCssDeclaration(property, value))
        .map(([property, value]) => `  ${kebabCase(property)}: ${markImportant(value)};`)
      // `html` makes the rule stronger than one utility class and weaker than the per-screen rules of an element.
      return [`html .${styleClassCssName(name)} {`, ...lines, '}'].join('\n')
    })
    .join('\n')
}
