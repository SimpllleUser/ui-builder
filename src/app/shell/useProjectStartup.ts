import { onMounted, ref, shallowRef } from 'vue'
import type { useUiTreeStore } from '../../modules/ui-builder/entities/ui-node'
import { startProjectSession, type ProjectSession } from '../../modules/projects/features/manage-projects'

export enum StartupState {
  Loading = 'loading',
  Ready = 'ready',
  Failed = 'failed',
}

/** The editor is shown only once a project is open, so an empty page can never be saved over a real one. */
export function useProjectStartup(store: ReturnType<typeof useUiTreeStore>, onReady: () => void) {
  const startup = ref(StartupState.Loading)
  // Shallow: the session keeps its own refs, which must not be unwrapped.
  const session = shallowRef<ProjectSession | null>(null)
  onMounted(async () => {
    try {
      session.value = await startProjectSession(store)
      startup.value = StartupState.Ready
      onReady()
    } catch (error) {
      console.error(error)
      startup.value = StartupState.Failed
    }
  })
  return { startup, session }
}
