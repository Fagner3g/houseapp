import type { customReminders } from '@/db/schemas/customReminders'
import type { alertRules } from '@/db/schemas/alertRules'
import {
  DEFAULT_ALERT_PREFERENCES,
  type AlertPreferences,
} from '@/db/schemas/userOrganization'
import { TIMEZONE } from '@/jobs/config'
import type { AlertRuleDto, ReminderDto } from './types'

export type { AlertPreferences }
export { DEFAULT_ALERT_PREFERENCES }

export function normalizeAlertPreferences(
  preferences: AlertPreferences | null | undefined
): AlertPreferences {
  return {
    whatsapp: preferences?.whatsapp ?? DEFAULT_ALERT_PREFERENCES.whatsapp,
    inApp: preferences?.inApp ?? DEFAULT_ALERT_PREFERENCES.inApp,
    extension: preferences?.extension ?? DEFAULT_ALERT_PREFERENCES.extension,
  }
}

export function isAlertChannelEnabled(
  channel: 'in_app' | 'whatsapp' | 'extension',
  notificationsEnabled: boolean,
  preferences: AlertPreferences | null | undefined
): boolean {
  const prefs = normalizeAlertPreferences(preferences)
  switch (channel) {
    case 'whatsapp':
      return notificationsEnabled && prefs.whatsapp
    case 'in_app':
      return prefs.inApp
    case 'extension':
      return prefs.extension
  }
}

export type NotifyTime = {
  hour: number
  minute: number
}

export function getCurrentHourInTimezone(timezone = TIMEZONE, referenceDate = new Date()): number {
  const hourStr = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    hour12: false,
  }).format(referenceDate)
  return parseInt(hourStr, 10)
}

export function getCurrentMinuteInTimezone(timezone = TIMEZONE, referenceDate = new Date()): number {
  const minuteStr = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    minute: 'numeric',
  }).format(referenceDate)
  return parseInt(minuteStr, 10)
}

export function resolveNotifyTime(
  notifyHour: number | null | undefined,
  notifyMinute: number | null | undefined,
  defaultNotifyHour: number | null | undefined,
  defaultNotifyMinute: number | null | undefined
): NotifyTime {
  return {
    hour: notifyHour ?? defaultNotifyHour ?? 9,
    minute: notifyMinute ?? defaultNotifyMinute ?? 0,
  }
}

export function matchesNotifyTime(
  resolved: NotifyTime,
  referenceDate = new Date(),
  timezone = TIMEZONE
): boolean {
  return (
    getCurrentHourInTimezone(timezone, referenceDate) === resolved.hour &&
    getCurrentMinuteInTimezone(timezone, referenceDate) === resolved.minute
  )
}

export function formatNotifyTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

export function formatDueDateKey(dueDate: Date, timezone = TIMEZONE): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(dueDate)
}

function parseCalendarDateKey(dateKey: string): number {
  const [year, month, day] = dateKey.split('-').map(Number)
  return Date.UTC(year, month - 1, day)
}

export function computeDaysUntilDue(
  dueDate: Date,
  referenceDate = new Date(),
  timezone = TIMEZONE
): number {
  const todayKey = formatDueDateKey(referenceDate, timezone)
  const dueKey = formatDueDateKey(dueDate, timezone)
  const diffMs = parseCalendarDateKey(dueKey) - parseCalendarDateKey(todayKey)
  return Math.round(diffMs / 86400000)
}

export function isReminderSnoozed(
  snoozedUntil: Date | null | undefined,
  referenceDate = new Date()
): boolean {
  return snoozedUntil != null && snoozedUntil > referenceDate
}

export function formatNotifyTimeForDedupe(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}${String(minute).padStart(2, '0')}`
}

export function buildReminderDedupeKey(
  reminderId: string,
  dueDate: Date,
  daysBefore: number,
  channel: string,
  notifyTime: NotifyTime
): string {
  const dueDateKey = formatDueDateKey(dueDate)
  const at = formatNotifyTimeForDedupe(notifyTime.hour, notifyTime.minute)
  return `reminder:${reminderId}:${dueDateKey}:day-${daysBefore}:at-${at}:${channel}`
}

export function buildInvestmentDedupeKey(
  planId: string,
  referenceMonth: string,
  channel: string,
  notifyTime: NotifyTime
): string {
  const at = formatNotifyTimeForDedupe(notifyTime.hour, notifyTime.minute)
  return `investment:${planId}:${referenceMonth}:at-${at}:${channel}`
}

export function getCurrentMonthKey(referenceDate = new Date()): string {
  const year = referenceDate.getUTCFullYear()
  const month = String(referenceDate.getUTCMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

export function bold(text: string): string {
  return `*${text.trim()}*`
}

export function formatDueLabel(daysUntilDue: number): string {
  if (daysUntilDue === 0) return 'hoje'
  if (daysUntilDue === 1) return 'amanhã'
  if (daysUntilDue < 0) return `${Math.abs(daysUntilDue)} dia(s) em atraso`
  return `em ${daysUntilDue} dias`
}

export function formatReminderWhatsAppMessage(payload: {
  title: string
  dueDate: string
  daysUntilDue: number
  amountCents: number | null
  notes: string | null
}): string {
  const dueLabel = formatDueLabel(payload.daysUntilDue)
  const dueFormatted = new Date(payload.dueDate).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
  const amountLine =
    payload.amountCents != null
      ? `\nValor: R$ ${(payload.amountCents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      : ''
  const notesLine = payload.notes ? `\n${payload.notes}` : ''

  return `🔔 ${bold(`Lembrete: ${payload.title}`)}\nVence ${dueLabel} (${dueFormatted})${amountLine}${notesLine}`
}

type ReminderRow = typeof customReminders.$inferSelect & {
  recipientName?: string | null
}

export function buildUpcomingRuleDedupeKey(
  ruleId: string,
  occurrenceId: string,
  daysBefore: number,
  userId: string,
  channel: string,
  notifyTime: NotifyTime
): string {
  const at = formatNotifyTimeForDedupe(notifyTime.hour, notifyTime.minute)
  return `rule:${ruleId}:${occurrenceId}:day-${daysBefore}:at-${at}:${userId}:${channel}`
}

export function buildOverdueRuleDedupeKey(
  ruleId: string,
  occurrenceId: string,
  periodKey: string,
  userId: string,
  channel: string,
  notifyTime: NotifyTime
): string {
  const at = formatNotifyTimeForDedupe(notifyTime.hour, notifyTime.minute)
  return `rule:${ruleId}:${occurrenceId}:period-${periodKey}:at-${at}:${userId}:${channel}`
}

export function getOverduePeriodKey(
  frequency: 'daily' | 'weekly' | 'monthly',
  interval: number,
  referenceDate = new Date()
): string {
  const epochDay = Math.floor(referenceDate.getTime() / 86400000)
  if (frequency === 'daily') {
    return `d-${Math.floor(epochDay / interval)}`
  }
  if (frequency === 'weekly') {
    const epochWeek = Math.floor(epochDay / 7)
    return `w-${Math.floor(epochWeek / interval)}`
  }
  const monthIndex = referenceDate.getFullYear() * 12 + referenceDate.getMonth()
  return `m-${Math.floor(monthIndex / interval)}`
}

export function formatInvestmentWhatsAppMessage(payload: {
  assetSymbol: string
  plannedAmount: number | null
  plannedQuantity: number | null
  referenceMonth: string
}): string {
  const amount =
    payload.plannedAmount != null
      ? `R$ ${payload.plannedAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      : payload.plannedQuantity != null
        ? `${payload.plannedQuantity} un.`
        : '—'

  return `Aporte pendente: ${payload.assetSymbol} - ${amount} (${payload.referenceMonth})`
}

function formatCentsBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
}

export function buildTransactionInstallmentInfo(
  installmentIndex: number | null | undefined,
  installmentsTotal: number | null | undefined
): string | null {
  if (installmentIndex == null || installmentsTotal == null) return null
  if (installmentsTotal <= 1) return null
  return `Parcela ${installmentIndex}/${installmentsTotal}`
}

export function buildTransactionPartialPaymentInfo(
  status: 'pending' | 'partial',
  valuePaidCents: number | null | undefined,
  amountCents: number
): string | null {
  if (status !== 'partial' || valuePaidCents == null) return null
  return `Pagamento parcial: R$ ${formatCentsBRL(valuePaidCents)} de R$ ${formatCentsBRL(amountCents)}`
}

export function buildTransactionAlertExtraInfo(input: {
  installmentIndex: number | null | undefined
  installmentsTotal: number | null | undefined
  status: 'pending' | 'partial'
  valuePaidCents: number | null | undefined
  amountCents: number
}): string | null {
  const lines = [
    buildTransactionInstallmentInfo(input.installmentIndex, input.installmentsTotal),
    buildTransactionPartialPaymentInfo(input.status, input.valuePaidCents, input.amountCents),
  ].filter((line): line is string => line != null)

  return lines.length > 0 ? lines.join('\n') : null
}

export function getTransactionDisplayAmountCents(input: {
  status: 'pending' | 'partial'
  amountCents: number
  valuePaidCents: number | null | undefined
}): number {
  if (input.status === 'partial' && input.valuePaidCents != null) {
    return input.amountCents - input.valuePaidCents
  }
  return input.amountCents
}

export function formatTransactionWhatsAppMessage(payload: {
  title: string
  dueDate: string
  amountCents: number
  daysUntilDue?: number
  overdueDays?: number
  installmentInfo?: string | null
  kind: 'upcoming' | 'overdue'
}): string {
  const dueFormatted = new Date(payload.dueDate).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
  const amountLine = `\nValor: R$ ${(payload.amountCents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
  const installmentLine = payload.installmentInfo ? `\n${payload.installmentInfo}` : ''

  if (payload.kind === 'upcoming') {
    const dueLabel = formatDueLabel(payload.daysUntilDue ?? 0)
    return `📅 ${bold(`Vencimento: ${payload.title}`)}\nVence ${dueLabel} (${dueFormatted})${amountLine}${installmentLine}`
  }

  const overdueLabel =
    payload.overdueDays === 1 ? '1 dia em atraso' : `${payload.overdueDays ?? 0} dias em atraso`
  return `⚠️ ${bold(`Vencida: ${payload.title}`)}\n${overdueLabel} (venceu ${dueFormatted})${amountLine}${installmentLine}`
}

type AlertRuleRow = typeof alertRules.$inferSelect & { seriesTitle?: string | null }

export function serializeAlertRule(row: AlertRuleRow): AlertRuleDto {
  return {
    id: row.id,
    organizationId: row.organizationId,
    scope: row.scope,
    seriesId: row.seriesId,
    kind: row.kind,
    config: row.config,
    channels: row.channels,
    recipients: row.recipients,
    active: row.active,
    createdBy: row.createdBy,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    seriesTitle: row.seriesTitle ?? null,
  }
}

export function serializeReminder(row: ReminderRow): ReminderDto {
  return {
    id: row.id,
    organizationId: row.organizationId,
    createdBy: row.createdBy,
    title: row.title,
    notes: row.notes,
    dueDate: row.dueDate.toISOString(),
    amountCents: row.amountCents != null ? Number(row.amountCents) : null,
    daysBefore: row.daysBefore,
    channels: row.channels,
    recipientUserId: row.recipientUserId,
    recipientName: row.recipientName ?? null,
    active: row.active,
    completedAt: row.completedAt?.toISOString() ?? null,
    isRecurring: row.isRecurring,
    recurrenceType: row.recurrenceType,
    recurrenceInterval: row.recurrenceInterval,
    recurrenceUntil: row.recurrenceUntil?.toISOString() ?? null,
    notifyHour: row.notifyHour,
    notifyMinute: row.notifyMinute,
    linkedSeriesId: row.linkedSeriesId,
    snoozedUntil: row.snoozedUntil?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}
