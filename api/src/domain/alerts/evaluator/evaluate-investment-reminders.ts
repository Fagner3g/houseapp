import { eq, inArray } from 'drizzle-orm'

import { db } from '@/db'
import { alertDeliveries } from '@/db/schemas/alertDeliveries'
import { investmentPlans } from '@/db/schemas/investmentPlans'
import { organizations } from '@/db/schemas/organization'
import type { AlertPreferences } from '@/db/schemas/userOrganization'
import { userOrganizations } from '@/db/schemas/userOrganization'
import { users } from '@/db/schemas/users'
import { investmentService } from '@/domain/investments/service'
import {
  buildInvestmentDedupeKey,
  getCurrentMonthKey,
  isAlertChannelEnabled,
  matchesNotifyTime,
  resolveNotifyTime,
  type NotifyTime,
} from '../utils'

type AlertChannel = 'in_app' | 'whatsapp' | 'extension'

export type InvestmentReminderItem = {
  assetId: string
  assetSymbol: string
  assetName: string
  planId: string
  referenceMonth: string
  dueDate: string
  plannedAmount: number | null
  plannedQuantity: number | null
  status: 'pending' | 'overdue'
}

export type InvestmentMatch = {
  userId: string
  organizationId: string
  orgSlug: string
  orgName: string
  item: InvestmentReminderItem
  notificationsEnabled: boolean
  alertPreferences: AlertPreferences
  recipientName: string | null
  recipientPhone: string | null
  channels: AlertChannel[]
  notifyTime: NotifyTime
}

const INVESTMENT_CHANNELS: AlertChannel[] = ['in_app', 'whatsapp', 'extension']

async function getUserAlertContext(userId: string) {
  const [row] = await db
    .select({
      organizationId: organizations.id,
      orgSlug: organizations.slug,
      orgName: organizations.name,
      defaultNotifyHour: organizations.defaultNotifyHour,
      defaultNotifyMinute: organizations.defaultNotifyMinute,
      notificationsEnabled: userOrganizations.notificationsEnabled,
      alertPreferences: userOrganizations.alertPreferences,
      recipientName: users.name,
      recipientPhone: users.phone,
    })
    .from(userOrganizations)
    .innerJoin(organizations, eq(userOrganizations.organizationId, organizations.id))
    .innerJoin(users, eq(users.id, userOrganizations.userId))
    .where(eq(userOrganizations.userId, userId))
    .orderBy(organizations.createdAt)
    .limit(1)

  return row ?? null
}

function shouldAlertInvestmentItem(item: InvestmentReminderItem, currentMonthKey: string): boolean {
  if (item.status === 'overdue') return true
  return item.status === 'pending' && item.referenceMonth === currentMonthKey
}

export async function evaluateInvestmentReminders(
  userId?: string,
  options?: { skipTimeCheck?: boolean }
): Promise<InvestmentMatch[]> {
  const userIds = userId
    ? [userId]
    : (
        await db
          .selectDistinct({ userId: investmentPlans.userId })
          .from(investmentPlans)
          .where(eq(investmentPlans.active, true))
      ).map(row => row.userId)

  const matches: InvestmentMatch[] = []
  const currentMonthKey = getCurrentMonthKey()

  for (const uid of userIds) {
    const context = await getUserAlertContext(uid)
    if (!context) continue

    const resolvedTime = resolveNotifyTime(
      null,
      null,
      context.defaultNotifyHour,
      context.defaultNotifyMinute
    )
    if (!options?.skipTimeCheck && !matchesNotifyTime(resolvedTime)) continue

    const { items } = await investmentService.getReminders(uid)

    for (const item of items) {
      if (!shouldAlertInvestmentItem(item, currentMonthKey)) continue

      const pendingChannels: AlertChannel[] = []
      for (const channel of INVESTMENT_CHANNELS) {
        if (
          !isAlertChannelEnabled(
            channel,
            context.notificationsEnabled,
            context.alertPreferences
          )
        ) {
          continue
        }

        const dedupeKey = buildInvestmentDedupeKey(
          item.planId,
          item.referenceMonth,
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
        userId: uid,
        organizationId: context.organizationId,
        orgSlug: context.orgSlug,
        orgName: context.orgName,
        item,
        notificationsEnabled: context.notificationsEnabled,
        alertPreferences: context.alertPreferences,
        recipientName: context.recipientName,
        recipientPhone: context.recipientPhone,
        channels: pendingChannels,
        notifyTime: resolvedTime,
      })
    }
  }

  return matches
}

async function resolveInvestmentUserIds(orgId?: string, userId?: string): Promise<string[]> {
  if (userId) return [userId]

  if (orgId) {
    const rows = await db
      .select({ userId: userOrganizations.userId })
      .from(userOrganizations)
      .where(eq(userOrganizations.organizationId, orgId))
    return rows.map(row => row.userId)
  }

  return (
    await db
      .selectDistinct({ userId: investmentPlans.userId })
      .from(investmentPlans)
      .where(eq(investmentPlans.active, true))
  ).map(row => row.userId)
}

async function findMatchingInvestmentItems(orgId?: string, userId?: string) {
  const userIds = await resolveInvestmentUserIds(orgId, userId)
  if (userIds.length === 0) return []

  const userRows = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(inArray(users.id, userIds))

  const userNames = new Map(userRows.map(row => [row.id, row.name]))

  const items: Array<InvestmentReminderItem & { userId: string; recipientName: string | null }> =
    []
  const currentMonthKey = getCurrentMonthKey()

  for (const uid of userIds) {
    const { items: pendingItems } = await investmentService.getReminders(uid)
    for (const item of pendingItems) {
      if (!shouldAlertInvestmentItem(item, currentMonthKey)) continue
      items.push({
        ...item,
        userId: uid,
        recipientName: userNames.get(uid) ?? null,
      })
    }
  }

  return items
}

export async function previewInvestmentAlerts(orgId?: string, userId?: string) {
  const items = await findMatchingInvestmentItems(orgId, userId)

  return {
    items: items.map(item => ({
      assetId: item.assetId,
      planId: item.planId,
      referenceMonth: item.referenceMonth,
      assetSymbol: item.assetSymbol,
      assetName: item.assetName,
      dueDate: item.dueDate,
      plannedAmount: item.plannedAmount,
      plannedQuantity: item.plannedQuantity,
      status: item.status,
      recipientUserId: item.userId,
      recipientName: item.recipientName,
    })),
  }
}
