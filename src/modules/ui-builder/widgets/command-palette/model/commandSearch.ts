import type { Command } from './commands'

/**
 * Finds commands for a typed query. Every word must appear in the title, group or keywords;
 * titles that start with the query, then ones with a word starting with it, rank first.
 */
export function searchCommands(commands: Command[], query: string, limit = 40): Command[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (!words.length) return commands.slice(0, limit)

  const scored: Array<{ command: Command; score: number }> = []
  for (const command of commands) {
    const title = command.title.toLowerCase()
    const haystack = `${title} ${command.subtitle ?? ''} ${command.group} ${command.keywords ?? ''}`.toLowerCase()
    if (!words.every(word => haystack.includes(word))) continue
    let score = 0
    for (const word of words) {
      if (title.startsWith(word)) score += 3
      else if (title.split(/[\s:·/-]+/).some(part => part.startsWith(word))) score += 2
      else if (title.includes(word)) score += 1
    }
    scored.push({ command, score })
  }
  // Stable: equal scores keep the order the commands were declared in (more useful groups first).
  return scored
    .map((entry, index) => ({ ...entry, index }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .map(entry => entry.command)
}
