import { ref } from 'vue'
import { useStorage } from '@vueuse/core'
import type { useUiTreeStore } from '../../../entities/ui-node/model/store'
import { isUntouched } from './tourSteps'

/** The quick tour: shown once to someone starting an empty project, and on request afterwards. */
export function useFirstRunTour(store: ReturnType<typeof useUiTreeStore>) {
  const done = useStorage('ui-builder:tour-done', false)
  const open = ref(!done.value && isUntouched(store.project))
  const finish = () => (done.value = true)
  const start = () => {
    done.value = false
    open.value = true
  }
  return { open, finish, start }
}
