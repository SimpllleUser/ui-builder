// Which of the open editor tabs gets the commands.

/**
 * A tab that edits its project wins over one where the project is locked because another tab edits it: the locked
 * one would refuse everything. Among equals the most recently loaded is the one the person has just opened or
 * reloaded; tabs reconnect in any order after the server restarts, so the order of connecting says nothing.
 */
export const pickTab = tabs =>
  [...tabs].sort((a, b) => Number(b.editing) - Number(a.editing) || b.loaded - a.loaded)[0] ?? null
