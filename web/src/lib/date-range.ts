import dayjs from 'dayjs'
import 'dayjs/locale/pt-br'

dayjs.locale('pt-br')

export function monthRangeISO(year?: number, month?: number) {
  const base = year && month ? dayjs().year(year).month(month - 1) : dayjs()
  return {
    dateFrom: base.startOf('month').toISOString(),
    dateTo: base.endOf('month').toISOString(),
  }
}

export function currentMonthRangeISO() {
  return monthRangeISO()
}

export function currentMonthKey(): string {
  return dayjs().format('YYYY-MM')
}

export function shiftMonth(monthKey: string, direction: -1 | 1): string {
  return dayjs(`${monthKey}-01`).add(direction, 'month').format('YYYY-MM')
}

export function monthKeyToRange(monthKey: string) {
  const anchor = dayjs(`${monthKey}-01`)
  return {
    dateFrom: anchor.startOf('month').format('YYYY-MM-DD'),
    dateTo: anchor.endOf('month').format('YYYY-MM-DD'),
    label: anchor.format('MMMM YYYY'),
  }
}
