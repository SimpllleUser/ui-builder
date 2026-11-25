import { isComputed, type useUiTreeStore } from '../../../entities/ui-node'

/** Variables are created where they are first used, with a starting value that fits the use. */
export function useEnsureVariable(store: ReturnType<typeof useUiTreeStore>) {
  return (name: string, initial: unknown) => {
    const trimmed = name.trim()
    if (!trimmed || trimmed in store.project.state || isComputed(store.project, trimmed)) return
    if (store.setStateVariable(trimmed, initial))
      store.setNotice(`Created variable “${trimmed}”. Change its starting value in the Variables panel.`)
  }
}
