export type MoveDestination = { parentId: string; slot: string | null }

export const parseMoveDestination = (value: string): MoveDestination | null => {
  try {
    const parsed: unknown = JSON.parse(value)
    if (!Array.isArray(parsed) || typeof parsed[0] !== 'string') return null
    if (parsed[1] !== null && typeof parsed[1] !== 'string') return null
    return { parentId: parsed[0], slot: parsed[1] }
  } catch {
    return null
  }
}

export const canSavePrefabName = (name: string): boolean => name.trim().length > 0
