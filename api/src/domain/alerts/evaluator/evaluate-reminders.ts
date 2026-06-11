import { and, eq, isNull } from 'drizzle-orm'

import { db } from '@/db'
import { alertDeliveries } from '@/db/schemas/alertDeliveries'
import { customReminders } from '@/db/schemas/customReminders'
import { organizations } from '@/db/schemas/organization'
import { userOrganizations } from '@/db/schemas/userOrganization'
import { users } from '@/db/schemas/users'
import type { ReminderChannel } from '@/db/schemas/customReminders'
import type { AlertPreferences } from '@/db/schemas/userOrganization'
import type { ReminderPreviewSkipItem } from '../types'
import {
  buildReminderDedupeKey,
  computeDaysUntilDue,
  isReminderSnoozed,
  matchesNotifyTime,
  resolveNotifyTime,
  type NotifyTime,
} from '../utils'

export type ReminderMatch = {
  reminder: typeof customReminders.$inferSelect
  daysUntilDue: number
  orgSlug: string
  recipientName: string | null
  recipientPhone: string | null
  notificationsEnabled: boolean
  alertPreferences: AlertPreferences
  channels: ReminderChannel[]
  notifyTime: NotifyTime
}

export async function evaluateReminders(
  userId?: string,
  options?: { skipTimeCheck?: boolean }
): Promise<ReminderMatch[]> {
  const conditions = [
    eq(customReminders.active, true),
    isNull(customReminders.completedAt),
  ]

  const rows = await db
    .select({
      reminder: customReminders,
      orgSlug: organizations.slug,
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
      userId
        ? and(...conditions, eq(customReminders.recipientUserId, userId))
        : and(...conditions)
    )

  const matches: ReminderMatch[] = []

  for (const row of rows) {
    if (isReminderSnoozed(row.reminder.snoozedUntil)) continue

    const resolvedTime = resolveNotifyTime(
      row.reminder.notifyHour,
      row.reminder.notifyMinute,
      row.defaultNotifyHour,
      row.defaultNotifyMinute
    )
    if (!options?.skipTimeCheck && !matchesNotifyTime(resolvedTime)) continue

    const daysUntilDue = computeDaysUntilDue(row.reminder.dueDate)
    const daysBefore = row.reminder.daysBefore.map(Number)
    if (!daysBefore.includes(daysUntilDue)) continue

    const pendingChannels: ReminderChannel[] = []
    for (const channel of row.reminder.channels) {
      const dedupeKey = buildReminderDedupeKey(
        row.reminder.id,
        row.reminder.dueDate,
        daysUntilDue,
        channel,
        resolvedTime
      )
      const [existing] = await db
        .select({ id: alertDeliveries.id })
        .from(alertDeliveries)
        .where(eq(alertDeliveries.dedupeKey, dedupeKey))
        .limit(1)

      if (!existing) {
        pendingChannels.push(channel)
      }
    }

    if (pendingChannels.length === 0) continue

    matches.push({
      reminder: row.reminder,
      daysUntilDue,
      orgSlug: row.orgSlug,
      recipientName: row.recipientName,
      recipientPhone: row.recipientPhone,
      notificationsEnabled: row.notificationsEnabled,
      alertPreferences: row.alertPreferences,
      channels: pendingChannels,
      notifyTime: resolvedTime,
    })
  }

  return matches
}

type ReminderPreviewRow = ReminderMatch

async function findReminderPreviewRows(orgId?: string, userId?: string) {
  const conditions = [
    eq(customReminders.active, true),
    isNull(customReminders.completedAt),
  ]

  const rows = await db
    .select({
      reminder: customReminders,
      orgSlug: organizations.slug,
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

  return rows
}

function findMatchingReminders(rows: Awaited<ReturnType<typeof findReminderPreviewRows>>) {
  const matches: ReminderPreviewRow[] = []
  const skipped: ReminderPreviewSkipItem[] = []
  const now = new Date()

  for (const row of rows) {
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
      continue
    }

    const daysBefore = row.reminder.daysBefore.map(Number)
    if (!daysBefore.includes(daysUntilDue)) {
      skipped.push({
        reminderId: row.reminder.id,
        title: row.reminder.title,
        reason: 'no_matching_day',
        daysUntilDue,
        notifyHour: notifyTime.hour,
        notifyMinute: notifyTime.minute,
      })
      continue
    }

    matches.push({
      reminder: row.reminder,
      daysUntilDue,
      orgSlug: row.orgSlug,
      recipientName: row.recipientName,
      recipientPhone: row.recipientPhone,
      notificationsEnabled: row.notificationsEnabled,
      alertPreferences: row.alertPreferences,
      channels: row.reminder.channels,
      notifyTime,
    })
  }

  return { matches, skipped }
}

export async function previewReminderAlerts(orgId?: string, userId?: string) {
  const rows = await findReminderPreviewRows(orgId, userId)
  const { matches, skipped } = findMatchingReminders(rows)

  return {
    items: matches.map(match => ({
      reminderId: match.reminder.id,
      title: match.reminder.title,
      dueDate: match.reminder.dueDate.toISOString(),
      daysUntilDue: match.daysUntilDue,
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
