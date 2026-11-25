import { computed } from 'vue'
import type { useUiTreeStore } from '../../../../ui-builder/entities/ui-node'
import {
  DEFAULT_THEME_SETTINGS,
  sanitizeThemeSettings,
  useThemeSettings,
} from '../../../../theme/entities/theme-settings'
import { createTabLocks } from '../../../../../shared/lib/webLocks'
import { openProjectRepository } from '../../../entities/project'
import { openProjectChannel } from './projectChannel'
import { createProjectSession } from './projectSession'

function parseTheme(text: string | null) {
  try {
    return text ? sanitizeThemeSettings(JSON.parse(text)) : { ...DEFAULT_THEME_SETTINGS }
  } catch {
    return { ...DEFAULT_THEME_SETTINGS }
  }
}

/** Connects the browser's storage, the editor and the theme, and opens a project. */
export async function startProjectSession(store: ReturnType<typeof useUiTreeStore>) {
  const { settings } = useThemeSettings()
  const theme = computed<string, string | null>({
    get: () => JSON.stringify(settings.value),
    set: text => {
      settings.value = parseTheme(text)
    },
  })
  const session = createProjectSession({
    repository: await openProjectRepository(),
    store,
    theme,
    browserStorage: window.localStorage,
    tabStorage: window.sessionStorage,
    channel: openProjectChannel(),
    locks: createTabLocks(),
  })
  await session.start()
  return session
}
