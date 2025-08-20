export type RecurrenceType = 'monthly' | 'weekly' | 'yearly' | 'custom'

export function addPeriod(d: Date, type: RecurrenceType, interval: number): Date {
  const date = new Date(d)
  switch (type) {
    case 'weekly':
      date.setDate(date.getDate() + 7 * interval)
      break
    case 'monthly':
      date.setMonth(date.getMonth() + interval)
      break
    case 'yearly':
      date.setFullYear(date.getFullYear() + interval)
      break
    case 'custom':
    default:
      date.setDate(date.getDate() + interval)
      break
  }
  return date
}

export function occurrencesBetween(start: Date, end: Date, type: RecurrenceType, interval: number): number {
  if (end < start) return 0
  let count = 1
  let next = addPeriod(start, type, interval)
  while (next <= end) {
    count++
    next = addPeriod(next, type, interval)
  }
  return count
}

export function humanizeInterval(type: RecurrenceType, interval: number): string {
  let unit: string
  let qty = interval
  switch (type) {
    case 'weekly':
      unit = 'semana'
      break
    case 'yearly':
      unit = 'ano'
      break
    case 'custom':
      unit = 'dia'
      break
    case 'monthly':
    default:
      if (interval % 12 === 0) {
        unit = 'ano'
        qty = interval / 12
      } else {
        unit = 'mês'
      }
      break
  }
  return `${qty} ${unit}${qty > 1 ? 's' : ''}`
}
