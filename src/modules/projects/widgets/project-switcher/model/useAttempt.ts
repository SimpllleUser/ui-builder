import { ref } from 'vue'

/** Runs an action asked for in the interface and keeps what went wrong, to be shown beside it. */
export function useAttempt() {
  const failure = ref('')
  const busy = ref(false)
  const attempt = async (action: () => Promise<unknown>) => {
    failure.value = ''
    busy.value = true
    try {
      await action()
    } catch (error) {
      failure.value = error instanceof Error ? error.message : 'This did not work. Try again.'
    } finally {
      busy.value = false
    }
  }
  return { failure, busy, attempt }
}
