import {
  cleanStyle,
  normalizeStyleInput,
  readStyle,
  withStyle,
  type StyleInput,
} from '../../../../../shared/lib/inlineStyle'
import { themeColorFromName } from '../../../../../shared/lib/themeColors'
import type { UiNode } from '../../../entities/ui-node'

/**
 * Applies a style description to an element: lengths as numbers, colours as theme colour names, and every value
 * winning over utility classes (`!important`). `null` removes the whole style, or one property inside the object.
 */
export function applyStyleInput(node: UiNode, input: StyleInput | string | null) {
  if (input === null) {
    delete node.props.style
    return
  }
  const description = typeof input === 'string' ? (readStyle(input) as StyleInput) : input
  const next = withStyle(readStyle(node.props.style), normalizeStyleInput(description, themeColorFromName))
  if (Object.keys(next).length) node.props.style = next
  else delete node.props.style
}

/** The element's style as the person sees it in the Design tab: without the `!important` markers. */
export const plainStyle = (node: UiNode) => cleanStyle(readStyle(node.props.style))
