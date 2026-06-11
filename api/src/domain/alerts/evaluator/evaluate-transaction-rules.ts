import { and, eq, gte, inArray, lt, lte, or, sql } from 'drizzle-orm'

import { db } from '@/db'
import type { AlertRuleChannel } from '@/db/schemas/alertRules'
import { alertRules } from '@/db/schemas/alertRules'
import { organizations } from '@/db/schemas/organization'
import { transactionOccurrences } from '@/db/schemas/transactionOccurrences'
import { transactionSeries } from '@/db/schemas/transactionSeries'
import type { AlertPreferences } from '@/db/schemas/userOrganization'
import { userOrganizations } from '@/db/schemas/userOrganization'
import { hasBlockingDedupeKey } from '../delivery/insert-alert-delivery'
import { resolveRuleForSeries } from '../rules/resolve-rule-for-series'
import type { RulePreviewItem } from '../types'
import {
  buildOverdueRuleDedupeKey,
  buildUpcomingRuleDedupeKey,
  computeDaysUntilDue,
  getOverduePeriodKey,
  matchesNotifyTime,
  resolveNotifyTime,
  type NotifyTime,
} from '../utils'

export type RuleRecipient = {
  userId: string
  name: string | null
  phone: string | null
  notificationsEnabled: boolean
  alertPreferences: AlertPreferences
}

export type TransactionRuleMatch = {
  rule: typeof alertRules.$inferSelect
  occurrence: {
    id: string
    seriesId: string
    title: string
    amountCents: number
    valuePaidCents: number | null
    dueDate: Date
    status: 'pending' | 'partial'
    installmentIndex: number | null
    installmentsTotal: number | null
  }
  orgId: string
  orgSlug: string
  orgName: string
  orgOwnerId: string
  kind: 'upcoming' | 'overdue'
  daysUntilDue?: number
  overdueDays?: number
  daysBefore?: number
  recipient: RuleRecipient
  channels: AlertRuleChannel[]
  notifyTime: NotifyTime
}

type OccurrenceRow = {
  occurrenceId: string
  seriesId: string
  title: string
  amount: bigint
  valuePaid: bigint | null
  dueDate: Date
  status: string
  installmentIndex: number | null
  installmentsTotal: number | null
  organizationId: string
  orgSlug: string
  orgName: string
  orgOwnerId: string
  defaultNotifyHour: number
  defaultNotifyMinute: number
  ownerId: string
  ownerName: string | null
  ownerPhone: string | null
  payToId: string
  payToName: string | null
  payToPhone: string | null
  ownerNotificationsEnabled: boolean
  payToNotificationsEnabled: boolean
  ownerAlertPreferences: AlertPreferences
  payToAlertPreferences: AlertPreferences
}

function resolveRecipientsFromRow(
  rule: typeof alertRules.$inferSelect,
  row: OccurrenceRow
): RuleRecipient[] {
  if (rule.recipients === 'none') return []

  const recipients: RuleRecipient[] = []

  if (rule.recipients === 'owner' || rule.recipients === 'both') {
    recipients.push({
      userId: row.ownerId,
      name: row.ownerName,
      phone: row.ownerPhone,
      notificationsEnabled: row.ownerNotificationsEnabled,
      alertPreferences: row.ownerAlertPreferences,
    })
  }

  if (rule.recipients === 'pay_to' || rule.recipients === 'both') {
    recipients.push({
      userId: row.payToId,
      name: row.payToName,
      phone: row.payToPhone,
      notificationsEnabled: row.payToNotificationsEnabled,
      alertPreferences: row.payToAlertPreferences,
    })
  }

  const unique = new Map<string, RuleRecipient>()
  for (const r of recipients) {
    if (!unique.has(r.userId)) unique.set(r.userId, r)
  }
  return Array.from(unique.values())
}

async function fetchOccurrenceRows(orgIds: string[], maxDaysAhead: number, userId?: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const maxDate = new Date(today.getTime() + maxDaysAhead * 86400000)
  maxDate.setHours(23, 59, 59, 999)

  const rows = await db
    .select({
      occurrenceId: transactionOccurrences.id,
      seriesId: transactionOccurrences.seriesId,
      title: transactionSeries.title,
      amount: transactionOccurrences.amount,
      valuePaid: transactionOccurrences.valuePaid,
      dueDate: transactionOccurrences.dueDate,
      status: transactionOccurrences.status,
      installmentIndex: transactionOccurrences.installmentIndex,
      installmentsTotal: transactionSeries.installmentsTotal,
      organizationId: transactionSeries.organizationId,
      orgSlug: organizations.slug,
      orgName: organizations.name,
      orgOwnerId: organizations.ownerId,
      defaultNotifyHour: organizations.defaultNotifyHour,
      defaultNotifyMinute: organizations.defaultNotifyMinute,
      ownerId: transactionSeries.ownerId,
      ownerName: sql<string>`owner.name`,
      ownerPhone: sql<string>`owner.phone`,
      payToId: transactionSeries.payToId,
      payToName: sql<string>`pay_to.name`,
      payToPhone: sql<string>`pay_to.phone`,
      ownerNotificationsEnabled: sql<boolean>`owner_uo.notifications_enabled`,
      payToNotificationsEnabled: sql<boolean>`pay_to_uo.notifications_enabled`,
      ownerAlertPreferences: sql<AlertPreferences>`owner_uo.alert_preferences`,
      payToAlertPreferences: sql<AlertPreferences>`pay_to_uo.alert_preferences`,
    })
    .from(transactionOccurrences)
    .innerJoin(transactionSeries, eq(transactionOccurrences.seriesId, transactionSeries.id))
    .innerJoin(organizations, eq(transactionSeries.organizationId, organizations.id))
    .innerJoin(sql`users as owner`, eq(transactionSeries.ownerId, sql`owner.id`))
    .innerJoin(sql`users as pay_to`, eq(transactionSeries.payToId, sql`pay_to.id`))
    .innerJoin(
      sql`user_organizations as owner_uo`,
      and(
        eq(sql`owner_uo.user_id`, transactionSeries.ownerId),
        eq(sql`owner_uo.organization_id`, transactionSeries.organizationId)
      )
    )
    .innerJoin(
      sql`user_organizations as pay_to_uo`,
      and(
        eq(sql`pay_to_uo.user_id`, transactionSeries.payToId),
        eq(sql`pay_to_uo.organization_id`, transactionSeries.organizationId)
      )
    )
    .where(
      and(
        inArray(transactionSeries.organizationId, orgIds),
        eq(transactionSeries.active, true),
        or(
          eq(transactionOccurrences.status, 'pending'),
          eq(transactionOccurrences.status, 'partial')
        ),
        or(
          and(
            gte(transactionOccurrences.dueDate, today),
            lte(transactionOccurrences.dueDate, maxDate)
          ),
          lt(transactionOccurrences.dueDate, today)
        ),
        userId
          ? or(eq(transactionSeries.ownerId, userId), eq(transactionSeries.payToId, userId))
          : sql`true`
      )
    )

  const unique = new Map<string, OccurrenceRow>()
  for (const row of rows) {
    if (!unique.has(row.occurrenceId)) {
      unique.set(row.occurrenceId, row as OccurrenceRow)
    }
  }
  return Array.from(unique.values())
}

async function getMaxUpcomingDays(orgIds: string[]): Promise<number> {
  const rules = await db
    .select({ config: alertRules.config })
    .from(alertRules)
    .where(
      and(
        inArray(alertRules.organizationId, orgIds),
        eq(alertRules.kind, 'upcoming'),
        eq(alertRules.active, true)
      )
    )

  let max = 4
  for (const rule of rules) {
    const config = rule.config as { daysBefore?: number[] }
    for (const d of config.daysBefore ?? []) {
      if (d > max) max = d
    }
  }
  return max
}

export async function evaluateTransactionRules(
  userId?: string,
  options?: { skipTimeCheck?: boolean }
): Promise<TransactionRuleMatch[]> {
  const orgRows = userId
    ? await db
        .select({ orgId: userOrganizations.organizationId })
        .from(userOrganizations)
        .where(eq(userOrganizations.userId, userId))
    : await db.select({ orgId: organizations.id }).from(organizations)

  const orgIds = orgRows.map(r => r.orgId)
  if (orgIds.length === 0) return []

  const maxDays = await getMaxUpcomingDays(orgIds)
  const rows = await fetchOccurrenceRows(orgIds, maxDays, userId)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const matches: TransactionRuleMatch[] = []

  for (const row of rows) {
    const resolvedTime = resolveNotifyTime(
      undefined,
      undefined,
      row.defaultNotifyHour,
      row.defaultNotifyMinute
    )
    if (!options?.skipTimeCheck && !matchesNotifyTime(resolvedTime)) continue

    const daysUntilDue = computeDaysUntilDue(row.dueDate)
    const isOverdue = daysUntilDue < 0

    if (!isOverdue) {
      const rule = await resolveRuleForSeries(row.organizationId, row.seriesId, 'upcoming')
      if (!rule) continue

      const config = rule.config as { daysBefore: number[] }
      const matchingDay = config.daysBefore.find(d => d === daysUntilDue)
      if (matchingDay === undefined) continue

      for (const recipient of resolveRecipientsFromRow(rule, row)) {
        const pendingChannels: AlertRuleChannel[] = []
        for (const channel of rule.channels) {
          const dedupeKey = buildUpcomingRuleDedupeKey(
            rule.id,
            row.occurrenceId,
            matchingDay,
            recipient.userId,
            channel,
            resolvedTime
          )
          if (!(await hasBlockingDedupeKey(dedupeKey))) {
            pendingChannels.push(channel)
          }
        }
        if (pendingChannels.length === 0) continue

        matches.push({
          rule,
          occurrence: {
            id: row.occurrenceId,
            seriesId: row.seriesId,
            title: row.title,
            amountCents: Number(row.amount),
            valuePaidCents: row.valuePaid ? Number(row.valuePaid) : null,
            dueDate: row.dueDate,
            status: row.status as 'pending' | 'partial',
            installmentIndex: row.installmentIndex,
            installmentsTotal: row.installmentsTotal,
          },
          orgId: row.organizationId,
          orgSlug: row.orgSlug,
          orgName: row.orgName,
          orgOwnerId: row.orgOwnerId,
          kind: 'upcoming',
          daysUntilDue,
          daysBefore: matchingDay,
          recipient,
          channels: pendingChannels,
          notifyTime: resolvedTime,
        })
      }
    } else {
      const rule = await resolveRuleForSeries(row.organizationId, row.seriesId, 'overdue')
      if (!rule) continue

      const config = rule.config as { frequency: 'daily' | 'weekly' | 'monthly'; interval: number }
      const periodKey = getOverduePeriodKey(config.frequency, config.interval)

      const overdueDays = Math.max(
        0,
        Math.ceil((today.getTime() - row.dueDate.getTime()) / 86400000)
      )

      for (const recipient of resolveRecipientsFromRow(rule, row)) {
        const pendingChannels: AlertRuleChannel[] = []
        for (const channel of rule.channels) {
          const dedupeKey = buildOverdueRuleDedupeKey(
            rule.id,
            row.occurrenceId,
            periodKey,
            recipient.userId,
            channel,
            resolvedTime
          )
          if (!(await hasBlockingDedupeKey(dedupeKey))) {
            pendingChannels.push(channel)
          }
        }
        if (pendingChannels.length === 0) continue

        matches.push({
          rule,
          occurrence: {
            id: row.occurrenceId,
            seriesId: row.seriesId,
            title: row.title,
            amountCents: Number(row.amount),
            valuePaidCents: row.valuePaid ? Number(row.valuePaid) : null,
            dueDate: row.dueDate,
            status: row.status as 'pending' | 'partial',
            installmentIndex: row.installmentIndex,
            installmentsTotal: row.installmentsTotal,
          },
          orgId: row.organizationId,
          orgSlug: row.orgSlug,
          orgName: row.orgName,
          orgOwnerId: row.orgOwnerId,
          kind: 'overdue',
          overdueDays,
          recipient,
          channels: pendingChannels,
          notifyTime: resolvedTime,
        })
      }
    }
  }

  return matches
}

function buildRulePreviewItem(match: TransactionRuleMatch): RulePreviewItem {
  const isPartial = match.occurrence.status === 'partial'
  const amountCents =
    isPartial && match.occurrence.valuePaidCents != null
      ? match.occurrence.amountCents - match.occurrence.valuePaidCents
      : match.occurrence.amountCents

  return {
    ruleId: match.rule.id,
    kind: match.kind,
    occurrenceId: match.occurrence.id,
    seriesId: match.occurrence.seriesId,
    title: match.occurrence.title,
    dueDate: match.occurrence.dueDate.toISOString(),
    daysUntilDue: match.daysUntilDue,
    overdueDays: match.overdueDays,
    amountCents,
    channels: match.channels,
    recipientUserId: match.recipient.userId,
    recipientName: match.recipient.name,
  }
}

function aggregateRulePreviewItems(matches: TransactionRuleMatch[]): RulePreviewItem[] {
  const grouped = new Map<
    string,
    {
      item: RulePreviewItem
      recipientNames: Set<string>
      channels: Set<AlertRuleChannel>
    }
  >()

  for (const match of matches) {
    const key = `${match.rule.id}:${match.occurrence.id}:${match.kind}`
    const recipientLabel = match.recipient.name?.trim() || 'Usuário'
    const existing = grouped.get(key)

    if (existing) {
      existing.recipientNames.add(recipientLabel)
      for (const channel of match.channels) {
        existing.channels.add(channel)
      }
      continue
    }

    grouped.set(key, {
      item: buildRulePreviewItem(match),
      recipientNames: new Set([recipientLabel]),
      channels: new Set(match.channels),
    })
  }

  return Array.from(grouped.values()).map(({ item, recipientNames, channels }) => ({
    ...item,
    recipientName: Array.from(recipientNames).join(', '),
    channels: Array.from(channels),
  }))
}

export async function previewTransactionRuleAlerts(orgId?: string, userId?: string) {
  const previewOptions = { skipTimeCheck: true } as const
  const matches = orgId
    ? await evaluateTransactionRulesForOrg(orgId, userId, previewOptions)
    : await evaluateTransactionRules(userId, previewOptions)

  return { items: aggregateRulePreviewItems(matches) }
}

async function evaluateTransactionRulesForOrg(
  orgId: string,
  userId?: string,
  options?: { skipTimeCheck?: boolean }
) {
  const allMatches = await evaluateTransactionRules(userId, options)
  return allMatches.filter(m => m.orgId === orgId)
}
