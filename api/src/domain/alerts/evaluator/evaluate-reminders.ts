import { and, eq, isNull } from 'drizzle-orm'

import { db } from '@/db'
import { customReminders } from '@/db/schemas/customReminders'
import { organizations } from '@/db/schemas/organization'
import { userOrganizations } from '@/db/schemas/userOrganization'
import { users } from '@/db/schemas/users'
import type { ReminderChannel } from '@/db/schemas/customReminders'
import type { AlertPreferences } from '@/db/schemas/userOrganization'
import { hasBlockingDedupeKey } from '../delivery/insert-alert-delivery'
import { resolveOrgAlertRule } from '../rules/resolve-org-alert-rule'
import type { ReminderPreviewSkipItem } from '../types'
import {
  buildReminderOverdueDedupeKey,
  buildReminderUpcomingDedupeKey,
  computeDaysUntilDue,
  getOverduePeriodKey,
  getReminderPeriodKey,
  isReminderSnoozed,
  matchesNotifyTime,
  resolveNotifyTime,
  type NotifyTime,
} from '../utils'

export type ReminderMatch = {
  reminder: typeof customReminders.$inferSelect
  kind: 'upcoming' | 'overdue'
  daysUntilDue: number
  daysBefore?: number
  overdueDays?: number
  overduePeriodKey?: string
  orgSlug: string
  orgName: string
  orgOwnerId: string
  recipientName: string | null
  recipientPhone: string | null
  notificationsEnabled: boolean
  alertPreferences: AlertPreferences
  channels: ReminderChannel[]
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

async function evaluateReminderRow(
  row: ReminderRow,
  options?: { skipTimeCheck?: boolean }
): Promise<ReminderMatch | null> {
  if (isReminderSnoozed(row.reminder.snoozedUntil)) return null

  const resolvedTime = resolveNotifyTime(
    row.reminder.notifyHour,
    row.reminder.notifyMinute,
    row.defaultNotifyHour,
    row.defaultNotifyMinute
  )
  if (!options?.skipTimeCheck && !matchesNotifyTime(resolvedTime)) return null

  const periodKey = getReminderPeriodKey(
    row.reminder.dueDate,
    row.reminder.isRecurring ? row.reminder.recurrenceType : null
  )
  if (row.reminder.lastCompletedPeriodKey === periodKey) return null

  const daysUntilDue = computeDaysUntilDue(row.reminder.dueDate)
  const isOverdue = daysUntilDue < 0

  if (!isOverdue) {
    const rule = await resolveOrgAlertRule(row.reminder.organizationId, 'upcoming')
    if (!rule) return null

    const config = rule.config as { daysBefore: number[] }
    const matchingDay = config.daysBefore.find(d => d === daysUntilDue)
    if (matchingDay === undefined) return null

    const pendingChannels: ReminderChannel[] = []
    for (const channel of row.reminder.channels) {
      const dedupeKey = buildReminderUpcomingDedupeKey(
        row.reminder.id,
        matchingDay,
        row.reminder.recipientUserId,
        channel,
        resolvedTime
      )
      if (!(await hasBlockingDedupeKey(dedupeKey))) {
        pendingChannels.push(channel)
      }
    }

    if (pendingChannels.length === 0) return null

    return {
      reminder: row.reminder,
      kind: 'upcoming',
      daysUntilDue,
      daysBefore: matchingDay,
      orgSlug: row.orgSlug,
      orgName: row.orgName,
      orgOwnerId: row.orgOwnerId,
      recipientName: row.recipientName,
      recipientPhone: row.recipientPhone,
      notificationsEnabled: row.notificationsEnabled,
      alertPreferences: row.alertPreferences,
      channels: pendingChannels,
      notifyTime: resolvedTime,
    }
  }

  const rule = await resolveOrgAlertRule(row.reminder.organizationId, 'overdue')
  if (!rule) return null

  const config = rule.config as { frequency: 'daily' | 'weekly' | 'monthly'; interval: number }
  const overduePeriodKey = getOverduePeriodKey(config.frequency, config.interval)

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const overdueDays = Math.max(
    0,
    Math.ceil((today.getTime() - row.reminder.dueDate.getTime()) / 86400000)
  )

  const pendingChannels: ReminderChannel[] = []
  for (const channel of row.reminder.channels) {
    const dedupeKey = buildReminderOverdueDedupeKey(
      row.reminder.id,
      overduePeriodKey,
      row.reminder.recipientUserId,
      channel,
      resolvedTime
    )
    if (!(await hasBlockingDedupeKey(dedupeKey))) {
      pendingChannels.push(channel)
    }
  }

  if (pendingChannels.length === 0) return null

  return {
    reminder: row.reminder,
    kind: 'overdue',
    daysUntilDue,
    overdueDays,
    overduePeriodKey,
    orgSlug: row.orgSlug,
    orgName: row.orgName,
    orgOwnerId: row.orgOwnerId,
    recipientName: row.recipientName,
    recipientPhone: row.recipientPhone,
    notificationsEnabled: row.notificationsEnabled,
    alertPreferences: row.alertPreferences,
    channels: pendingChannels,
    notifyTime: resolvedTime,
  }
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

      if (isReminderSnoozed(row.reminder.snoozedUntil, now)) {
        skipped.push({
          reminderId: row.reminder.id,
          title: row.reminder.title,
          reason: 'snoozed',
          daysUntilDue,
          notifyHour: notifyTime.hour,
          notifyMinute: notifyTime.minute,
          snoozedUntil: row.reminder.snoozedUntil?.toISOString(),
        })
        return
      }

      const periodKey = getReminderPeriodKey(
        row.reminder.dueDate,
        row.reminder.isRecurring ? row.reminder.recurrenceType : null
      )
      if (row.reminder.lastCompletedPeriodKey === periodKey) {
        skipped.push({
          reminderId: row.reminder.id,
          title: row.reminder.title,
          reason: 'period_completed',
          daysUntilDue,
          notifyHour: notifyTime.hour,
          notifyMinute: notifyTime.minute,
        })
        return
      }

      const match = await evaluateReminderRow(row, { skipTimeCheck: true, ...options })
      if (match) {
        matches.push(match)
        return
      }

      skipped.push({
        reminderId: row.reminder.id,
        title: row.reminder.title,
        reason: 'no_matching_rule',
        daysUntilDue,
        notifyHour: notifyTime.hour,
        notifyMinute: notifyTime.minute,
      })
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
