import dayjs from 'dayjs'

import type { ReportDateRange } from '../report.repository'

export function monthKeysBetween(dateFrom: Date, dateTo: Date) {
  const keys: string[] = []
  let cursor = dayjs(dateFrom).startOf('month')
  const end = dayjs(dateTo).startOf('month')

  while (!cursor.isAfter(end)) {
    keys.push(cursor.format('YYYY-MM'))
    cursor = cursor.add(1, 'month')
  }

  return keys
}

export function monthKeysAround(range: ReportDateRange) {
  const keys = new Set(monthKeysBetween(range.from, range.to))
  keys.add(dayjs(range.from).subtract(1, 'month').format('YYYY-MM'))
  keys.add(dayjs(range.to).add(1, 'month').format('YYYY-MM'))
  return [...keys]
}
