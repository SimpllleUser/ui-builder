import type { DataSource } from './types'

export const DEFAULT_DELAY_MS = 600
export const MAX_DELAY_MS = 10_000

const SITE_PATH = /^\/(?!\/)[\w\-./]*$/
const WEB_ADDRESS = /^https?:\/\/[^\s'"\\<>]+$/

/** Why the address cannot be used, or null when it can. */
export function endpointError(url: string): string | null {
  if (!url) return 'Enter an address, such as /api/orders.'
  const isPath = SITE_PATH.test(url) && !url.includes('..')
  return isPath || WEB_ADDRESS.test(url) ? null : 'Use a path such as /api/orders or an http(s) address.'
}

export const isDataSource = (value: unknown): value is DataSource => {
  if (typeof value !== 'object' || value === null) return false
  const { url, delayMs, loadingVariable } = value as Partial<DataSource>
  return (
    typeof url === 'string' &&
    !endpointError(url) &&
    typeof delayMs === 'number' &&
    delayMs >= 0 &&
    delayMs <= MAX_DELAY_MS &&
    (loadingVariable === undefined || typeof loadingVariable === 'string')
  )
}

/** What a variable holds before its data has arrived. */
export const emptyLike = (value: unknown): unknown => {
  if (Array.isArray(value)) return []
  return value !== null && typeof value === 'object' ? {} : ''
}
