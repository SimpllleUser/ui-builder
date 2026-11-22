/** Starter set shown to everyone until they have favorites and a history of their own. */
export const POPULAR_TYPES = ['VBtn', 'VCard', 'VCardText', 'VTextField', 'div', 'VRow', 'VCol', 'VDataTable']

export enum QuickSectionId {
  Favorites = 'favorites',
  Recent = 'recent',
  Popular = 'popular',
}

export interface QuickSection {
  id: QuickSectionId
  title: string
  types: string[]
}

/**
 * The few components worth showing up front: favorites first, then what was used lately, then the popular ones.
 * A component appears once, in the first section that has it, and only components that still exist are listed.
 */
export function quickSections(favorites: string[], recent: string[], available: Set<string>): QuickSection[] {
  const shown = new Set<string>()
  const take = (types: string[]) =>
    types.filter(type => {
      if (!available.has(type) || shown.has(type)) return false
      shown.add(type)
      return true
    })
  const sections: QuickSection[] = [
    { id: QuickSectionId.Favorites, title: 'Favorites', types: take(favorites) },
    { id: QuickSectionId.Recent, title: 'Recent', types: take(recent) },
    { id: QuickSectionId.Popular, title: 'Popular', types: take(POPULAR_TYPES) },
  ]
  return sections.filter(section => section.types.length)
}
