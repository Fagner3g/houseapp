import { and, eq, isNull } from 'drizzle-orm'

import { db } from '@/db'
import type { AlertRuleChannel } from '@/db/schemas/alertRules'
import { customReminders } from '@/db/schemas/customReminders'
import { organizations } from '@/db/schemas/organization'
import { userOrganizations } from '@/db/schemas/userOrganization'
import { users } from '@/db/schemas/users'
import type { AlertPreferences } from '@/db/schemas/userOrganization'
import { hasBlockingDedupeKey } from '../delivery/insert-alert-delivery'
import { resolveReminderAlertRule } from '../rules/resolve-reminder-alert-rule'
import type { ReminderPreviewSkipItem, ReminderPreviewSkipReason } from '../types'
import {
  buildReminderOverdueDayDedupeKey,
  buildReminderUpcomingDedupeKey,
  computeDaysUntilDue,
  getReminderPeriodKey,
  isReminderSnoozed,
  matchesNotifyTime,
  resolveNotifyTime,
  resolveReminderEvaluationDueDate,
  type NotifyTime,
} from '../utils'

export type ReminderMatch = {
  reminder: typeof customReminders.$inferSelect
  kind: 'upcoming' | 'overdue'
  daysUntilDue: number
  daysBefore?: number
  daysAfter?: number
  overdueDays?: number
  orgSlug: string
  orgName: string
  orgOwnerId: string
  recipientName: string | null
  recipientPhone: string | null
  notificationsEnabled: boolean
  alertPreferences: AlertPreferences
  channels: AlertRuleChannel[]
  notifyTime: NotifyTime
}

type ReminderRow = {
  reminder: typeof customReminders.$inferSelect
  orgSlug: string
  orgName: string
  orgOwnerId: string
  defaultNotifyHour: number
  defaultNotifyMinute: number
  recipientName: string | null
  recipientPhone: string | null
  notificationsEnabled: boolean
  alertPreferences: AlertPreferences
}

type ReminderEvalResult =
  | { status: 'match'; match: ReminderMatch }
  | { status: 'skip'; reason: ReminderPreviewSkipReason }
  | { status: 'ignore' }

async function fetchReminderRows(userId?: string, orgId?: string) {
  const conditions = [
    eq(customReminders.active, true),
    isNull(customReminders.completedAt),
  ]

  return db
    .select({
      reminder: customReminders,
      orgSlug: organizations.slug,
      orgName: organizations.name,
      orgOwnerId: organizations.ownerId,
      defaultNotifyHour: organizations.defaultNotifyHour,
      defaultNotifyMinute: organizations.defaultNotifyMinute,
      recipientName: users.name,
      recipientPhone: users.phone,
      notificationsEnabled: userOrganizations.notificationsEnabled,
      alertPreferences: userOrganizations.alertPreferences,
    })
    .from(customReminders)
    .innerJoin(organizations, eq(customReminders.organizationId, organizations.id))
    .innerJoin(users, eq(customReminders.recipientUserId, users.id))
    .innerJoin(
      userOrganizations,
      and(
        eq(userOrganizations.userId, customReminders.recipientUserId),
        eq(userOrganizations.organizationId, customReminders.organizationId)
      )
    )
    .where(
      and(
        ...conditions,
        ...(orgId ? [eq(customReminders.organizationId, orgId)] : []),
        ...(userId ? [eq(customReminders.recipientUserId, userId)] : [])
      )
    )
}

function buildReminderMatch(
  row: ReminderRow,
  input: {
    kind: 'upcoming' | 'overdue'
    daysUntilDue: number
    daysBefore?: number
    daysAfter?: number
    overdueDays?: number
    channels: AlertRuleChannel[]
    notifyTime: NotifyTime
  }
): ReminderMatch {
  return {
    reminder: row.reminder,
    kind: input.kind,
    daysUntilDue: input.daysUntilDue,
    daysBefore: input.daysBefore,
    daysAfter: input.daysAfter,
    overdueDays: input.overdueDays,
    orgSlug: row.orgSlug,
    orgName: row.orgName,
    orgOwnerId: row.orgOwnerId,
    recipientName: row.recipientName,
    recipientPhone: row.recipientPhone,
    notificationsEnabled: row.notificationsEnabled,
    alertPreferences: row.alertPreferences,
    channels: input.channels,
    notifyTime: input.notifyTime,
  }
}

async function evaluateReminderRowCore(
  row: ReminderRow,
  options?: { skipTimeCheck?: boolean; referenceDate?: Date }
): Promise<ReminderEvalResult> {
  if (isReminderSnoozed(row.reminder.snoozedUntil)) {
    return { status: 'skip', reason: 'snoozed' }
  }

  const referenceDate = options?.referenceDate ?? new Date()
  const resolvedTime = resolveNotifyTime(
    row.reminder.notifyHour,
    row.reminder.notifyMinute,
    row.defaultNotifyHour,
    row.defaultNotifyMinute
  )
  if (!options?.skipTimeCheck && !matchesNotifyTime(resolvedTime, referenceDate)) {
    return { status: 'ignore' }
  }

  const evaluationDueDate = resolveReminderEvaluationDueDate(row.reminder, referenceDate)
  const reminderForEval =
    evaluationDueDate.getTime() === row.reminder.dueDate.getTime()
      ? row.reminder
      : { ...row.reminder, dueDate: evaluationDueDate }

  const periodKey = getReminderPeriodKey(
    reminderForEval.dueDate,
    reminderForEval.isRecurring ? reminderForEval.recurrenceType : null
  )
  if (reminderForEval.lastCompletedPeriodKey === periodKey) {
    return { status: 'skip', reason: 'period_completed' }
  }

  const daysUntilDue = computeDaysUntilDue(reminderForEval.dueDate, referenceDate)
  const isOverdue = daysUntilDue < 0

  if (!isOverdue) {
    const rule = await resolveReminderAlertRule(reminderForEval, 'upcoming')
    if (!rule) return { status: 'skip', reason: 'no_rule' }

    const config = rule.config as { daysBefore: number[] }
    const matchingDay = config.daysBefore.find(d => d === daysUntilDue)
    if (matchingDay === undefined) {
      return { status: 'skip', reason: 'outside_schedule' }
    }

    const pendingChannels: AlertRuleChannel[] = []
    for (const channel of rule.channels) {
      const dedupeKey = buildReminderUpcomingDedupeKey(
        reminderForEval.id,
        matchingDay,
        reminderForEval.recipientUserId,
        channel,
        resolvedTime
      )
      if (!(await hasBlockingDedupeKey(dedupeKey))) {
        pendingChannels.push(channel)
      }
    }

    if (pendingChannels.length === 0) {
      return { status: 'skip', reason: 'already_sent' }
    }

    return {
      status: 'match',
      match: buildReminderMatch(
        { ...row, reminder: reminderForEval },
        {
          kind: 'upcoming',
          daysUntilDue,
          daysBefore: matchingDay,
          channels: pendingChannels,
          notifyTime: resolvedTime,
        }
      ),
    }
  }

  const rule = await resolveReminderAlertRule(reminderForEval, 'upcoming')
  if (!rule) return { status: 'skip', reason: 'no_rule' }

  const config = rule.config as { daysBefore: number[] }
  const overdueDays = Math.max(0, -daysUntilDue)
  const matchingDay = config.daysBefore.find(d => d === overdueDays && d > 0)
  if (matchingDay === undefined) {
    return { status: 'skip', reason: 'outside_schedule' }
  }

  const pendingChannels: AlertRuleChannel[] = []
  for (const channel of rule.channels) {
    const dedupeKey = buildReminderOverdueDayDedupeKey(
      reminderForEval.id,
      matchingDay,
      reminderForEval.recipientUserId,
      channel,
      resolvedTime
    )
    if (!(await hasBlockingDedupeKey(dedupeKey))) {
      pendingChannels.push(channel)
    }
  }

  if (pendingChannels.length === 0) {
    return { status: 'skip', reason: 'already_sent' }
  }

  return {
    status: 'match',
    match: buildReminderMatch(
      { ...row, reminder: reminderForEval },
      {
        kind: 'overdue',
        daysUntilDue,
        daysAfter: matchingDay,
        overdueDays,
        channels: pendingChannels,
        notifyTime: resolvedTime,
      }
    ),
  }
}

async function evaluateReminderRow(
  row: ReminderRow,
  options?: { skipTimeCheck?: boolean }
): Promise<ReminderMatch | null> {
  const result = await evaluateReminderRowCore(row, options)
  return result.status === 'match' ? result.match : null
}

export async function evaluateReminders(
  userId?: string,
  options?: { skipTimeCheck?: boolean }
): Promise<ReminderMatch[]> {
  const rows = await fetchReminderRows(userId)
  const matches: ReminderMatch[] = []

  for (const row of rows) {
    const match = await evaluateReminderRow(row, options)
    if (match) matches.push(match)
  }

  return matches
}

type ReminderPreviewRow = ReminderMatch

function findMatchingReminders(
  rows: Awaited<ReturnType<typeof fetchReminderRows>>,
  options?: { skipTimeCheck?: boolean }
) {
  const matches: ReminderPreviewRow[] = []
  const skipped: ReminderPreviewSkipItem[] = []
  const now = new Date()

  return Promise.all(
    rows.map(async row => {
      const notifyTime = resolveNotifyTime(
        row.reminder.notifyHour,
        row.reminder.notifyMinute,
        row.defaultNotifyHour,
        row.defaultNotifyMinute
      )
      const daysUntilDue = computeDaysUntilDue(row.reminder.dueDate, now)

      const result = await evaluateReminderRowCore(row, {
        skipTimeCheck: true,
        referenceDate: now,
        ...options,
      })

      if (result.status === 'match') {
        matches.push(result.match)
        return
      }

      if (result.status === 'skip') {
        skipped.push({
          reminderId: row.reminder.id,
          title: row.reminder.title,
          reason: result.reason,
          daysUntilDue,
          notifyHour: notifyTime.hour,
          notifyMinute: notifyTime.minute,
          ...(result.reason === 'snoozed' && row.reminder.snoozedUntil
            ? { snoozedUntil: row.reminder.snoozedUntil.toISOString() }
            : {}),
        })
      }
    })
  ).then(() => ({ matches, skipped }))
}

export async function previewReminderAlerts(orgId?: string, userId?: string) {
  const rows = await fetchReminderRows(userId, orgId)
  const { matches, skipped } = await findMatchingReminders(rows, { skipTimeCheck: true })

  return {
    items: matches.map(match => ({
      reminderId: match.reminder.id,
      title: match.reminder.title,
      dueDate: match.reminder.dueDate.toISOString(),
      kind: match.kind,
      daysUntilDue: match.daysUntilDue,
      overdueDays: match.overdueDays,
      amountCents:
        match.reminder.amountCents != null ? Number(match.reminder.amountCents) : null,
      notifyHour: match.notifyTime.hour,
      notifyMinute: match.notifyTime.minute,
      channels: match.channels,
      recipientUserId: match.reminder.recipientUserId,
      recipientName: match.recipientName,
    })),
    skipped,
  }
}
