/** "order desk" and "order-desk" become "OrderDesk". Characters that cannot be in a file name are dropped. */
export function toPascalCase(text: string): string {
  return text
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map(word => word[0].toUpperCase() + word.slice(1))
    .join('')
}
