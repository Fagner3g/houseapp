import type { GetReportByCategory200CategoriesItem } from '@/api/generated/model'
import type { GetReportDaily200DaysItem } from '@/api/generated/model/getReportDaily200DaysItem'
import type { GetReportTrends200MonthsItem } from '@/api/generated/model/getReportTrends200MonthsItem'
import dayjs from 'dayjs'
import 'dayjs/locale/pt-br'

import { moneyStringToReais } from '@/lib/currency'

dayjs.locale('pt-br')

export function mapCategoryToChartData(categories: GetReportByCategory200CategoriesItem[]) {
  return categories.map(cat => ({
    category: cat.name,
    count: 1,
    totalAmount: moneyStringToReais(cat.total),
    color: cat.color ?? undefined,
  }))
}

export function mapTrendsToChartData(months: GetReportTrends200MonthsItem[]) {
  return months.map(m => ({
    month: dayjs(`${m.month}-01`).format('MMM/YY'),
    income: moneyStringToReais(m.income),
    expense: moneyStringToReais(m.expense),
  }))
}

export function mapDailyToChartData(days: GetReportDaily200DaysItem[]) {
  return days.map(d => ({
    date: d.date,
    income: moneyStringToReais(d.income),
    expense: moneyStringToReais(d.expense),
    total: moneyStringToReais(d.income) + moneyStringToReais(d.expense),
  }))
}

export function computeDeltaPercent(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? null : 0
  return ((current - previous) / previous) * 100
}

export function formatDeltaPercent(delta: number | null): string {
  if (delta == null) return 'novo'
  if (delta === 0) return '0%'
  const sign = delta > 0 ? '+' : ''
  return `${sign}${delta.toFixed(0)}%`
}
