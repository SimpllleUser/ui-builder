import { nextTick } from 'vue'
import type { useUiTreeStore } from '../../modules/ui-builder/entities/ui-node'
import { sanitizeThemeSettings, useThemeSettings } from '../../modules/theme/entities/theme-settings'

/** What to take a picture of, as the editor describes it. */
export interface ScreenshotSource {
  /** The exported project, theme included. */
  document: string
  /** The page to show. */
  path: string
  /** What the variables hold in the running Preview, or null for their starting values. */
  state: Record<string, unknown> | null
}

declare global {
  interface Window {
    uiBuilderScreenshot?: (source: ScreenshotSource) => Promise<void>
  }
}

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
const SETTLE_MS = 100

/** Brings the store to the state to be pictured. Resolves once data sources have answered. */
export async function showScreenshotSource(store: ReturnType<typeof useUiTreeStore>, source: ScreenshotSource) {
  const { theme } = JSON.parse(source.document)
  if (theme) useThemeSettings().settings.value = sanitizeThemeSettings(theme)
  store.importDocument(source.document)
  store.startPreview()
  // Preview starts over once more on the next tick, so the page is chosen after that.
  await nextTick()
  store.navigate(source.path)
  const delays = Object.values(store.project.sources ?? {}).map(({ delayMs }) => delayMs)
  await wait(Math.max(0, ...delays) + SETTLE_MS)
  if (source.state) Object.assign(store.runtimeState, source.state)
}
