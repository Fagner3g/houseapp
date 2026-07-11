import { and, eq } from 'drizzle-orm'

import { db } from '@/db'
import { organizationMembers } from '@/db/schemas/organizationMembers'
import { users } from '@/db/schemas/users'
import { badRequest } from '@/core/errors'
import { personKey } from '@/modules/splits/split-debt-summary.logic'
import type { PendingSplitNotifyRow } from '@/modules/splits/split.repository'
import type { SplitRepository } from '@/modules/splits/split.repository'

import type { ManualAlertTarget } from './types'

export function splitMatchesTarget(split: PendingSplitNotifyRow, targetKey: string): boolean {
  if (targetKey.startsWith('user:')) {
    return split.userId === targetKey.slice('user:'.length)
  }

  if (targetKey.startsWith('contact:')) {
    return !split.userId && personKey(split) === targetKey
  }

  return false
}

export function transactionMatchesTarget(
  transaction: {
    notifyTargetType: 'member' | 'contact' | null
    notifyUserId: string | null
  },
  targetKey: string
): boolean {
  if (!targetKey.startsWith('user:')) {
    return false
  }

  const targetUserId = targetKey.slice('user:'.length)
  return transaction.notifyTargetType === 'member' && transaction.notifyUserId === targetUserId
}

export async function verifyOrganizationMember(
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
    throw badRequest('User is not a member of this organization')
  }
}

export async function listManualAlertTargets(
  splitRepository: SplitRepository,
  organizationId: string
): Promise<ManualAlertTarget[]> {
  const members = await db
    .select({
      userId: users.id,
      name: users.name,
      phone: users.phone,
    })
    .from(users)
    .innerJoin(organizationMembers, eq(users.id, organizationMembers.userId))
    .where(eq(organizationMembers.organizationId, organizationId))

  const targets: ManualAlertTarget[] = members.map(member => ({
    key: personKey({ userId: member.userId, contactName: null, contactPhone: null }),
    name: member.name ?? 'Membro',
    type: 'member',
    phone: member.phone,
    userId: member.userId,
  }))

  const activeSplits = await splitRepository.listActivePendingSplits(organizationId)
  const seenContactKeys = new Set<string>()

  for (const split of activeSplits) {
    if (split.userId) continue

    const key = personKey(split)
    if (seenContactKeys.has(key)) continue
    seenContactKeys.add(key)

    targets.push({
      key,
      name: split.contactName ?? 'Contato',
      type: 'contact',
      phone: split.contactPhone,
      userId: null,
    })
  }

  return targets.sort((left, right) => left.name.localeCompare(right.name, 'pt-BR'))
}
