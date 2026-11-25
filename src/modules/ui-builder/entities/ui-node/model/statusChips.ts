/** How a column marked "Status chip" looks. Preview draws from this and exported code is written from it. */
export const STATUS_COLORS: Readonly<Record<string, string>> = {
  paid: 'success',
  done: 'success',
  completed: 'success',
  delivered: 'success',
  active: 'success',
  pending: 'warning',
  processing: 'warning',
  new: 'info',
  shipped: 'info',
  cancelled: 'error',
  canceled: 'error',
  failed: 'error',
  refunded: 'error',
  blocked: 'error',
}
export const DEFAULT_STATUS_COLOR = 'default'
export const STATUS_CHIP_PROPS = { size: 'small', variant: 'tonal' } as const

export const statusColor = (value: unknown): string => {
  const status = String(value ?? '').toLowerCase()
  return Object.hasOwn(STATUS_COLORS, status) ? STATUS_COLORS[status] : DEFAULT_STATUS_COLOR
}

const isChipColumn = (header: unknown): header is { key: string; chip: unknown } =>
  typeof header === 'object' &&
  header !== null &&
  'chip' in header &&
  !!header.chip &&
  'key' in header &&
  typeof header.key === 'string'

/** The keys of the columns shown as chips. */
export const chipColumnKeys = (headers: unknown): string[] =>
  Array.isArray(headers) ? headers.filter(isChipColumn).map(header => header.key) : []
