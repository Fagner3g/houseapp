import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'

dayjs.extend(utc)
dayjs.extend(timezone)

const TIMEZONE = 'America/Sao_Paulo'

export const DEFAULT_NOTIFY_HOUR = 9
export const DEFAULT_NOTIFY_MINUTE = 0

export function hasReachedNotifyTime(
  notifyHour: number,
  notifyMinute: number,
  referenceDate = new Date()
): boolean {
  const now = dayjs(referenceDate).tz(TIMEZONE)
  const currentMinutes = now.hour() * 60 + now.minute()
  const scheduledMinutes = notifyHour * 60 + notifyMinute
  return currentMinutes >= scheduledMinutes
}

export function formatNotifyTime(notifyHour: number, notifyMinute: number): string {
  return `${String(notifyHour).padStart(2, '0')}:${String(notifyMinute).padStart(2, '0')}`
}

export function computeDaysUntilDue(dueDate: Date, referenceDate = new Date()): number {
  const due = dayjs(dueDate).tz(TIMEZONE).startOf('day')
  const today = dayjs(referenceDate).tz(TIMEZONE).startOf('day')
  return due.diff(today, 'day')
}

export function formatDueDateKey(date: Date, tz = TIMEZONE): string {
  return dayjs(date).tz(tz).format('YYYY-MM-DD')
}

export function getOverduePeriodKey(
  frequency: 'daily' | 'weekly' | 'monthly',
  interval: number,
  referenceDate = new Date(),
  tz = TIMEZONE
): string {
  const dateKey = formatDueDateKey(referenceDate, tz)
  const [year, month, day] = dateKey.split('-').map(Number)
  const epochDay = Math.floor(Date.UTC(year, month - 1, day) / 86400000)

  if (frequency === 'daily') {
    return `d-${Math.floor(epochDay / interval)}`
  }

  if (frequency === 'weekly') {
    const epochWeek = Math.floor(epochDay / 7)
    return `w-${Math.floor(epochWeek / interval)}`
  }

  const monthIndex = year * 12 + (month - 1)
  return `m-${Math.floor(monthIndex / interval)}`
}

export function buildUpcomingRuleDedupeKey(
  ruleId: string,
  transactionId: string,
  daysBefore: number,
  userId: string,
  channel: string
): string {
  return `rule:${ruleId}:${transactionId}:day-${daysBefore}:${userId}:${channel}`
}

export function buildOverdueRuleDedupeKey(
  ruleId: string,
  transactionId: string,
  periodKey: string,
  userId: string,
  channel: string
): string {
  return `rule:${ruleId}:${transactionId}:period-${periodKey}:${userId}:${channel}`
}

export function buildUpcomingTitle(title: string, daysUntilDue: number): string {
  if (daysUntilDue === 0) return `Vence hoje: ${title}`
  if (daysUntilDue === 1) return `Vence amanhã: ${title}`
  return `Vence em ${daysUntilDue} dias: ${title}`
}

export function buildOverdueTitle(title: string, overdueDays: number): string {
  if (overdueDays === 1) return `Vencido há 1 dia: ${title}`
  return `Vencido há ${overdueDays} dias: ${title}`
}

export function buildSplitOverdueDedupeKey(
  splitId: string,
  periodKey: string,
  targetKey: string,
  channel: string
): string {
  return `split:${splitId}:period-${periodKey}:${targetKey}:${channel}`
}

export function buildSplitUpcomingDedupeKey(
  splitId: string,
  daysBefore: number,
  targetKey: string,
  channel: string
): string {
  return `split:${splitId}:day-${daysBefore}:${targetKey}:${channel}`
}

export function buildDebtReminderTitle(title: string, daysUntilDue: number): string {
  if (daysUntilDue === 0) return `Pague hoje: ${title}`
  if (daysUntilDue === 1) return `Pague amanhã: ${title}`
  return `Pague em ${daysUntilDue} dias: ${title}`
}

export function buildSplitDebtTitle(transactionTitle: string, daysUntilDue: number): string {
  if (daysUntilDue === 0) return `Você deve hoje: ${transactionTitle}`
  if (daysUntilDue === 1) return `Você deve amanhã: ${transactionTitle}`
  return `Você deve em ${daysUntilDue} dias: ${transactionTitle}`
}
