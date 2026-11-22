export interface TourStep {
  title: string
  text: string
  /** Elements to point at, first one that exists on screen wins. */
  targets: string[]
}

export const TOUR_STEPS: TourStep[] = [
  {
    title: 'Start with a template or a component',
    text: 'Pick one of the templates below, or open Components on the left and click or drag a component onto the page.',
    targets: ['[data-tour="start"]', '.activity-button'],
  },
  {
    title: 'Select an element',
    text: 'Click anything on the page. Its name, quick actions and settings appear. Press Ctrl/⌘ K to search for anything.',
    targets: ['[data-tour="canvas"]'],
  },
  {
    title: 'Try it in Preview',
    text: 'Preview runs your page: buttons, variables and links work. Esc brings you back to the editor.',
    targets: ['[data-tour="preview"]'],
  },
]

export interface TourProgress {
  hasContent: boolean
  hasSelection: boolean
  previewing: boolean
}

/**
 * The step the person has already done, so the tour moves on by itself as they work.
 * Returns the step to show: the first one whose action is still missing, or `null` when all three are done.
 */
export function stepAfterProgress(step: number, progress: TourProgress): number | null {
  const done = [progress.hasContent, progress.hasSelection, progress.previewing]
  let next = step
  while (next < TOUR_STEPS.length && done[next]) next++
  return next >= TOUR_STEPS.length ? null : next
}

/** A project nobody has started yet: one page with nothing on it and no variables. */
export function isUntouched(project: {
  pages: Array<{ root: { children: unknown[]; slots: Record<string, unknown[]> } }>
  layout: unknown
  state: Record<string, unknown>
}): boolean {
  const [page] = project.pages
  return (
    project.pages.length === 1 &&
    !project.layout &&
    Object.keys(project.state).length === 0 &&
    page.root.children.length === 0 &&
    Object.values(page.root.slots).every(nodes => nodes.length === 0)
  )
}
