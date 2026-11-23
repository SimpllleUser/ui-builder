const SECONDS_IN_MINUTE = 60
const SECONDS_IN_HOUR = 3600
const SECONDS_IN_DAY = 86400
const JUST_NOW_SECONDS = 45

export const shortDateTime = new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'short' })

/** “just now”, “5 min ago”, “3 h ago”, or the date and time for anything older than a day. */
export function timeAgo(at: number, now = Date.now()): string {
  const seconds = Math.round((now - at) / 1000)
  if (seconds < JUST_NOW_SECONDS) return 'just now'
  if (seconds < SECONDS_IN_HOUR) return `${Math.max(1, Math.round(seconds / SECONDS_IN_MINUTE))} min ago`
  if (seconds < SECONDS_IN_DAY) return `${Math.round(seconds / SECONDS_IN_HOUR)} h ago`
  return shortDateTime.format(at)
}
