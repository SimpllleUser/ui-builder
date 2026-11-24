const MIRRORED_ATTRIBUTE = 'data-mirrored-style'
const STYLE_SELECTOR = 'style'
const STYLESHEET_LINK_SELECTOR = 'link[rel="stylesheet"]'

/**
 * Copies the styles of one document into another (an iframe) and keeps the copy up to date, so a change
 * made while the frame is open, such as a new theme colour, shows in the frame at once.
 * Returns a function that stops following the source.
 */
export function mirrorStyles(source: Document, target: Document): () => void {
  const copyAll = (selector: string) =>
    [...source.querySelectorAll(selector)].map(element => {
      const copy = target.importNode(element, true)
      copy.setAttribute(MIRRORED_ATTRIBUTE, '')
      return copy
    })

  // Stylesheet links are copied once: copying them again would make the frame load them again and flash.
  target.head.prepend(...copyAll(STYLESHEET_LINK_SELECTOR))
  const syncStyles = () => {
    target.head.querySelectorAll(`${STYLE_SELECTOR}[${MIRRORED_ATTRIBUTE}]`).forEach(style => style.remove())
    target.head.prepend(...copyAll(STYLE_SELECTOR))
  }
  syncStyles()

  const observer = new MutationObserver(syncStyles)
  observer.observe(source.head, { childList: true, subtree: true, characterData: true })
  return () => observer.disconnect()
}
