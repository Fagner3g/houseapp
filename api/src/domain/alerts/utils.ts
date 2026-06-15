import type { customReminders, ReminderRecurrenceType } from '@/db/schemas/customReminders'
import { addPeriod, subPeriod } from '@/domain/recurrence/utils'
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

export type AlertChannel = 'in_app' | 'whatsapp' | 'extension'

export type LogicalAlertIdentity = {
  userId: string
  sourceType: 'rule' | 'reminder' | 'investment'
  kind: string
  occurrenceId: string | null
  reminderId: string | null
  ruleId: string | null
  payload: Record<string, unknown>
}

export function buildLogicalAlertKey(alert: LogicalAlertIdentity): string {
  switch (alert.sourceType) {
    case 'rule':
      return [
        'rule',
        alert.userId,
        alert.kind,
        alert.occurrenceId ?? '',
        alert.ruleId ?? '',
        String(alert.payload.daysUntilDue ?? ''),
        String(alert.payload.overdueDays ?? ''),
      ].join(':')
    case 'reminder':
      return [
        'reminder',
        alert.userId,
        alert.reminderId ?? '',
        String(alert.payload.dueDate ?? ''),
        String(alert.payload.daysUntilDue ?? ''),
      ].join(':')
    case 'investment':
      return [
        'investment',
        alert.userId,
        alert.kind,
        String(alert.payload.planId ?? ''),
        String(alert.payload.referenceMonth ?? ''),
      ].join(':')
  }
}

const CHANNEL_PRIORITY: Record<AlertChannel, number> = {
  whatsapp: 0,
  in_app: 1,
  extension: 2,
}

type DeliveryWithChannel = LogicalAlertIdentity & {
  channel: AlertChannel
  sentAt: string | null
  createdAt: string
}

export function dedupeDeliveriesByLogicalAlert<T extends DeliveryWithChannel>(
  deliveries: T[]
): (T & { channels: AlertChannel[] })[] {
  const byKey = new Map<string, { primary: T; channels: Set<AlertChannel> }>()

  for (const delivery of deliveries) {
    const key = buildLogicalAlertKey(delivery)
    const existing = byKey.get(key)
    if (!existing) {
      byKey.set(key, { primary: delivery, channels: new Set([delivery.channel]) })
      continue
    }

    existing.channels.add(delivery.channel)
    const currentPriority = CHANNEL_PRIORITY[delivery.channel]
    const primaryPriority = CHANNEL_PRIORITY[existing.primary.channel]
    if (currentPriority < primaryPriority) {
      existing.primary = delivery
    }
  }

  return Array.from(byKey.values()).map(({ primary, channels }) => ({
    ...primary,
    channels: [...channels].sort((a, b) => CHANNEL_PRIORITY[a] - CHANNEL_PRIORITY[b]),
  }))
}

export function buildReminderUpcomingDedupeKey(
  reminderId: string,
  daysBefore: number,
  userId: string,
  channel: string,
  notifyTime: NotifyTime
): string {
  const at = formatNotifyTimeForDedupe(notifyTime.hour, notifyTime.minute)
  return `reminder:${reminderId}:day-${daysBefore}:at-${at}:${userId}:${channel}`
}

export function buildReminderOverdueDedupeKey(
  reminderId: string,
  periodKey: string,
  userId: string,
  channel: string,
  notifyTime: NotifyTime
): string {
  const at = formatNotifyTimeForDedupe(notifyTime.hour, notifyTime.minute)
  return `reminder:${reminderId}:period-${periodKey}:at-${at}:${userId}:${channel}`
}

export function buildReminderOverdueDayDedupeKey(
  reminderId: string,
  daysAfter: number,
  userId: string,
  channel: string,
  notifyTime: NotifyTime
): string {
  const at = formatNotifyTimeForDedupe(notifyTime.hour, notifyTime.minute)
  return `reminder:${reminderId}:overdue-day-${daysAfter}:at-${at}:${userId}:${channel}`
}

/** @deprecated Use buildReminderUpcomingDedupeKey or buildReminderOverdueDedupeKey */
export function buildReminderDedupeKey(
  reminderId: string,
  _dueDate: Date,
  daysBefore: number,
  userId: string,
  channel: string,
  notifyTime: NotifyTime
): string {
  return buildReminderUpcomingDedupeKey(reminderId, daysBefore, userId, channel, notifyTime)
}

function getIsoWeekInTimezone(date: Date, timezone = TIMEZONE): { year: number; week: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const year = Number(parts.find(p => p.type === 'year')?.value)
  const month = Number(parts.find(p => p.type === 'month')?.value)
  const day = Number(parts.find(p => p.type === 'day')?.value)
  const utcDate = new Date(Date.UTC(year, month - 1, day))
  const dayNum = utcDate.getUTCDay() || 7
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil(((utcDate.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return { year: utcDate.getUTCFullYear(), week: weekNo }
}

type ReminderOccurrenceState = Pick<
  typeof customReminders.$inferSelect,
  'dueDate' | 'completedAt' | 'isRecurring' | 'recurrenceType' | 'recurrenceInterval' | 'recurrenceUntil' | 'lastCompletedPeriodKey'
>

/** Anchor hour for calendar date keys (15:00 UTC = 12:00 in America/Sao_Paulo). */
const ORG_CALENDAR_DATE_UTC_HOUR = 15

export function parseOccurrenceDateKey(value: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number)
    return new Date(Date.UTC(year, month - 1, day, ORG_CALENDAR_DATE_UTC_HOUR, 0, 0))
  }
  return new Date(value)
}

/** Transaction due date when completing a reminder period (defaults to period due date). */
export function resolveReminderTransactionDueDate(
  dateKey: string | undefined,
  periodDueDate: Date
): Date {
  if (dateKey?.trim()) {
    return parseOccurrenceDateKey(dateKey.trim())
  }
  const result = new Date(periodDueDate)
  result.setHours(0, 0, 0, 0)
  return result
}

export function applyDateKeyToDueDate(dueDate: Date, dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number)
  const result = new Date(dueDate)
  result.setFullYear(year, month - 1, day)
  return result
}

export function isReminderOccurrenceCompleted(
  reminder: ReminderOccurrenceState,
  occurrenceDate: Date,
  timezone = TIMEZONE
): boolean {
  const occurrenceKey = formatDueDateKey(occurrenceDate, timezone)
  const currentDueKey = formatDueDateKey(reminder.dueDate, timezone)

  if (!reminder.isRecurring || !reminder.recurrenceType) {
    return reminder.completedAt != null && occurrenceKey === currentDueKey
  }

  if (occurrenceKey < currentDueKey) return true
  if (occurrenceKey > currentDueKey) return false

  return reminder.completedAt != null || reminder.lastCompletedPeriodKey != null
}

export function isValidReminderOccurrenceDate(
  reminder: ReminderOccurrenceState,
  occurrenceDate: Date,
  timezone = TIMEZONE
): boolean {
  const occurrenceKey = formatDueDateKey(occurrenceDate, timezone)

  if (!reminder.isRecurring || !reminder.recurrenceType) {
    return occurrenceKey === formatDueDateKey(reminder.dueDate, timezone)
  }

  const untilKey = reminder.recurrenceUntil
    ? formatDueDateKey(reminder.recurrenceUntil, timezone)
    : null
  if (untilKey && occurrenceKey > untilKey) return false

  const type = reminder.recurrenceType
  const interval = reminder.recurrenceInterval || 1
  let current = new Date(reminder.dueDate)

  while (formatDueDateKey(current, timezone) >= occurrenceKey) {
    if (formatDueDateKey(current, timezone) === occurrenceKey) return true
    const prev = subPeriod(current, type, interval)
    if (formatDueDateKey(prev, timezone) >= formatDueDateKey(current, timezone)) break
    current = prev
  }

  return false
}

export function resolveReminderEvaluationDueDate(
  reminder: ReminderOccurrenceState,
  referenceDate = new Date(),
  timezone = TIMEZONE
): Date {
  if (!reminder.isRecurring || !reminder.recurrenceType) {
    return reminder.dueDate
  }

  const type = reminder.recurrenceType
  const interval = reminder.recurrenceInterval || 1
  let due = new Date(reminder.dueDate)
  const todayPeriodKey = getReminderPeriodKey(referenceDate, type, timezone)
  const untilKey = reminder.recurrenceUntil
    ? formatDueDateKey(reminder.recurrenceUntil, timezone)
    : null

  while (true) {
    const duePeriodKey = getReminderPeriodKey(due, type, timezone)
    if (duePeriodKey >= todayPeriodKey) break

    const nextDue = addPeriod(due, type, interval)
    const nextDueKey = formatDueDateKey(nextDue, timezone)
    if (untilKey && nextDueKey > untilKey) break
    if (nextDueKey === formatDueDateKey(due, timezone)) break
    due = nextDue
  }

  return due
}

export function getReminderPeriodKey(
  dueDate: Date,
  recurrenceType?: ReminderRecurrenceType | null,
  timezone = TIMEZONE
): string {
  if (recurrenceType === 'yearly') {
    return new Intl.DateTimeFormat('en-US', { timeZone: timezone, year: 'numeric' }).format(dueDate)
  }
  if (recurrenceType === 'weekly') {
    const { year, week } = getIsoWeekInTimezone(dueDate, timezone)
    return `${year}-W${String(week).padStart(2, '0')}`
  }
  const formatted = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
  }).format(dueDate)
  return formatted
}

export function getEndOfDueMonth(dueDate: Date, timezone = TIMEZONE): Date {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: 'numeric',
  }).formatToParts(dueDate)
  const year = Number(parts.find(p => p.type === 'year')?.value)
  const month = Number(parts.find(p => p.type === 'month')?.value)
  const lastDay = new Date(year, month, 0).getDate()
  const end = new Date()
  end.setFullYear(year, month - 1, lastDay)
  end.setHours(23, 59, 59, 999)
  return end
}

export function isDateInDueMonth(
  date: Date,
  dueDate: Date,
  timezone = TIMEZONE
): boolean {
  const dateKey = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
  }).format(date)
  const dueKey = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
  }).format(dueDate)
  return dateKey === dueKey
}

export function buildInvestmentDedupeKey(
  planId: string,
  referenceMonth: string,
  userId: string,
  channel: string,
  notifyTime: NotifyTime
): string {
  const at = formatNotifyTimeForDedupe(notifyTime.hour, notifyTime.minute)
  return `investment:${planId}:${referenceMonth}:at-${at}:${userId}:${channel}`
}

export function getCurrentMonthKey(referenceDate = new Date()): string {
  const year = referenceDate.getUTCFullYear()
  const month = String(referenceDate.getUTCMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

export function bold(text: string): string {
  return `*${text.trim()}*`
}

export function formatRecipientFirstName(name: string | null | undefined): string | null {
  if (!name?.trim()) return null
  return name.trim().split(/\s+/)[0] ?? null
}

export function getTimeBasedGreeting(
  referenceDate = new Date(),
  timezone = TIMEZONE
): 'Bom dia' | 'Boa tarde' | 'Boa noite' {
  const hour = getCurrentHourInTimezone(timezone, referenceDate)
  if (hour >= 5 && hour < 12) return 'Bom dia'
  if (hour >= 12 && hour < 18) return 'Boa tarde'
  return 'Boa noite'
}

export function formatWhatsAppGreeting(
  recipientName?: string | null,
  referenceDate = new Date(),
  timezone = TIMEZONE
): string {
  const greeting = getTimeBasedGreeting(referenceDate, timezone)
  const firstName = formatRecipientFirstName(recipientName)
  return firstName ? `${greeting}, ${firstName}!` : `${greeting}!`
}

export function formatWhatsAppOrgSection(orgName: string): string {
  return `🏠 ${bold(orgName)}`
}

export const WHATSAPP_ALERT_BODY_DIVIDER = '───'

function formatCentsBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
}

export function joinWhatsAppAlertBodies(bodies: string[]): string {
  if (bodies.length <= 1) return bodies.join('')
  return bodies.join(`\n\n${WHATSAPP_ALERT_BODY_DIVIDER}\n\n`)
}

function formatWhatsAppAmount(cents: number): string {
  return `💰 R$ ${formatCentsBRL(cents)}`
}

function formatWhatsAppExtraInfoLine(line: string): string {
  if (line.startsWith('Parcela ')) return `📎 ${line}`
  if (line.startsWith('Pagamento parcial:')) return `💳 ${line}`
  return line
}

function formatWhatsAppExtraInfo(installmentInfo: string | null | undefined): string[] {
  if (!installmentInfo) return []
  return installmentInfo.split('\n').map(formatWhatsAppExtraInfoLine)
}

function formatWhatsAppAlertBlock(header: string, detailLines: string[]): string {
  return [header, '', ...detailLines].join('\n')
}

export function composeWhatsAppAlertMessage(input: {
  recipientName?: string | null
  orgName: string
  isOrgOwner?: boolean
  bodies: string[]
  referenceDate?: Date
  timezone?: string
}): string {
  const timezone = input.timezone ?? TIMEZONE
  const referenceDate = input.referenceDate ?? new Date()
  const greeting = formatWhatsAppGreeting(input.recipientName, referenceDate, timezone)

  const sections = [greeting]

  if (input.isOrgOwner) {
    sections.push('', formatWhatsAppOrgSection(input.orgName))
  }

  sections.push('', joinWhatsAppAlertBodies(input.bodies))

  return sections.join('\n')
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
  daysUntilDue?: number
  overdueDays?: number
  amountCents: number | null
  notes: string | null
  kind: 'upcoming' | 'overdue'
}): string {
  const dueFormatted = new Date(payload.dueDate).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
  const detailLines =
    payload.kind === 'upcoming'
      ? [`Vence ${formatDueLabel(payload.daysUntilDue ?? 0)} · ${dueFormatted}`]
      : [
          `${payload.overdueDays === 1 ? '1 dia em atraso' : `${payload.overdueDays ?? 0} dias em atraso`} · venceu ${dueFormatted}`,
        ]

  if (payload.amountCents != null) {
    detailLines.push(formatWhatsAppAmount(payload.amountCents))
  }
  if (payload.notes) {
    detailLines.push(`📝 ${payload.notes}`)
  }

  return formatWhatsAppAlertBlock(`🔔 ${bold(payload.title)}`, detailLines)
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
  referenceDate = new Date(),
  timezone = TIMEZONE
): string {
  const dateKey = formatDueDateKey(referenceDate, timezone)
  const epochDay = Math.floor(parseCalendarDateKey(dateKey) / 86400000)
  if (frequency === 'daily') {
    return `d-${Math.floor(epochDay / interval)}`
  }
  if (frequency === 'weekly') {
    const epochWeek = Math.floor(epochDay / 7)
    return `w-${Math.floor(epochWeek / interval)}`
  }
  const [year, month] = dateKey.split('-').map(Number)
  const monthIndex = year * 12 + (month - 1)
  return `m-${Math.floor(monthIndex / interval)}`
}

export function formatInvestmentWhatsAppMessage(payload: {
  assetSymbol: string
  plannedAmount: number | null
  plannedQuantity: number | null
  referenceMonth: string
  status?: 'pending' | 'overdue'
}): string {
  const amount =
    payload.plannedAmount != null
      ? `R$ ${payload.plannedAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      : payload.plannedQuantity != null
        ? `${payload.plannedQuantity} un.`
        : '—'

  const isOverdue = payload.status === 'overdue'
  const icon = isOverdue ? '❗' : '📈'
  const label = isOverdue ? 'Aporte atrasado' : 'Aporte pendente'

  return formatWhatsAppAlertBlock(`${icon} ${bold(`${label}: ${payload.assetSymbol}`)}`, [
    `Referência · ${payload.referenceMonth}`,
    `💰 ${amount}`,
  ])
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
  const detailLines = [
    payload.kind === 'upcoming'
      ? `Vence ${formatDueLabel(payload.daysUntilDue ?? 0)} · ${dueFormatted}`
      : `${payload.overdueDays === 1 ? '1 dia em atraso' : `${payload.overdueDays ?? 0} dias em atraso`} · venceu ${dueFormatted}`,
    formatWhatsAppAmount(payload.amountCents),
    ...formatWhatsAppExtraInfo(payload.installmentInfo),
  ]

  const icon = payload.kind === 'upcoming' ? '📅' : '❗'
  return formatWhatsAppAlertBlock(`${icon} ${bold(payload.title)}`, detailLines)
}

type AlertRuleRow = typeof alertRules.$inferSelect & { seriesTitle?: string | null }

export function serializeAlertRule(row: AlertRuleRow): AlertRuleDto {
  return {
    id: row.id,
    organizationId: row.organizationId,
    scope: row.scope,
    target: row.target,
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
    useOrgAlertDefaults: row.useOrgAlertDefaults,
    overdueAlertFrequency: row.overdueAlertFrequency ?? null,
    overdueAlertInterval: row.overdueAlertInterval,
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
    lastCompletedPeriodKey: row.lastCompletedPeriodKey ?? null,
    generatesTransaction: row.generatesTransaction,
    defaultPayToId: row.defaultPayToId,
    transactionType: row.transactionType,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}
