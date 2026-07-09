import { and, eq } from 'drizzle-orm'

import { db } from '@/db'
import { organizationMembers } from '@/db/schemas/organizationMembers'
import type { NotifyTargetType, TransactionNotifyOverdueConfig } from '@/db/schemas/transactions'
import { badRequest } from '@/core/errors'

import { validateNotifyOverdueConfig } from './notify-overdue-config'

export type NotifyTargetInput = {
  notifyEnabled?: boolean
  notifyTargetType?: NotifyTargetType | null
  notifyUserId?: string | null
  notifyContactName?: string | null
  notifyContactPhone?: string | null
  notifyDaysBefore?: number[] | null
  notifyOverdueConfig?: TransactionNotifyOverdueConfig | null
}

export type ResolvedNotifyTarget = {
  notifyEnabled: boolean
  notifyTargetType: NotifyTargetType | null
  notifyUserId: string | null
  notifyContactName: string | null
  notifyContactPhone: string | null
  notifyDaysBefore: number[] | null
  notifyOverdueConfig: TransactionNotifyOverdueConfig | null
}

export function resolveNotifyTarget(
  input: NotifyTargetInput,
  existing?: ResolvedNotifyTarget | null
): ResolvedNotifyTarget {
  const notifyEnabled = input.notifyEnabled ?? existing?.notifyEnabled ?? false

  if (!notifyEnabled) {
    return {
      notifyEnabled: false,
      notifyTargetType: null,
      notifyUserId: null,
      notifyContactName: null,
      notifyContactPhone: null,
      notifyDaysBefore: null,
      notifyOverdueConfig: null,
    }
  }

  const notifyTargetType =
    input.notifyTargetType !== undefined
      ? input.notifyTargetType
      : (existing?.notifyTargetType ?? null)

  const notifyUserId =
    input.notifyUserId !== undefined ? input.notifyUserId : (existing?.notifyUserId ?? null)

  const notifyContactName =
    input.notifyContactName !== undefined
      ? input.notifyContactName
      : (existing?.notifyContactName ?? null)

  const notifyContactPhone =
    input.notifyContactPhone !== undefined
      ? input.notifyContactPhone
      : (existing?.notifyContactPhone ?? null)

  const notifyDaysBefore =
    input.notifyDaysBefore !== undefined
      ? input.notifyDaysBefore
      : (existing?.notifyDaysBefore ?? null)

  const notifyOverdueConfig =
    input.notifyOverdueConfig !== undefined
      ? validateNotifyOverdueConfig(input.notifyOverdueConfig)
      : (existing?.notifyOverdueConfig ?? null)

  if (!notifyTargetType) {
    throw badRequest('notifyTargetType is required when notifyEnabled is true')
  }

  if (notifyTargetType === 'member' && !notifyUserId) {
    throw badRequest('notifyUserId is required for member notify target')
  }

  if (notifyTargetType === 'contact' && !notifyContactName?.trim()) {
    throw badRequest('notifyContactName is required for contact notify target')
  }

  if (notifyDaysBefore != null) {
    if (!Array.isArray(notifyDaysBefore) || notifyDaysBefore.length === 0) {
      throw badRequest('notifyDaysBefore must contain at least one day when provided')
    }

    for (const day of notifyDaysBefore) {
      if (!Number.isInteger(day) || day < 0) {
        throw badRequest('notifyDaysBefore must contain non-negative integers')
      }
    }
  }

  return {
    notifyEnabled: true,
    notifyTargetType,
    notifyUserId: notifyTargetType === 'member' ? notifyUserId : null,
    notifyContactName: notifyTargetType === 'contact' ? notifyContactName?.trim() ?? null : null,
    notifyContactPhone:
      notifyTargetType === 'contact' ? notifyContactPhone?.trim() || null : null,
    notifyDaysBefore,
    notifyOverdueConfig,
  }
}

export async function assertNotifyUserBelongsToOrg(
  organizationId: string,
  userId: string
): Promise<void> {
  const [member] = await db
    .select({ userId: organizationMembers.userId })
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.organizationId, organizationId),
        eq(organizationMembers.userId, userId)
      )
    )
    .limit(1)

  if (!member) {
    throw badRequest('notifyUserId must be an organization member')
  }
}

export function notifyTargetFromRecord(record: {
  notifyEnabled: boolean
  notifyTargetType: NotifyTargetType | null
  notifyUserId: string | null
  notifyContactName: string | null
  notifyContactPhone: string | null
  notifyDaysBefore: number[] | null
  notifyOverdueConfig: TransactionNotifyOverdueConfig | null
}): ResolvedNotifyTarget {
  return {
    notifyEnabled: record.notifyEnabled,
    notifyTargetType: record.notifyTargetType,
    notifyUserId: record.notifyUserId,
    notifyContactName: record.notifyContactName,
    notifyContactPhone: record.notifyContactPhone,
    notifyDaysBefore: record.notifyDaysBefore,
    notifyOverdueConfig: record.notifyOverdueConfig,
  }
}
