import { eq } from 'drizzle-orm'

import { db } from '@/db'
import { users } from '@/db/schemas/users'
import { badRequest, notFound } from '@/core/errors'
import { normalizePhone } from '@/domain/whatsapp'
import { personKey } from '@/modules/splits/split-debt-summary.logic'
import type { SplitRepository } from '@/modules/splits/split.repository'

import { sendManualAlertsForTarget } from './manual-dispatch'
import { verifyOrganizationMember } from './manual-targets'
import type { ManualAlertType } from './types'

export async function sendManualMemberAlerts(
  splitRepository: SplitRepository,
  organizationId: string,
  userId: string,
  type: Extract<ManualAlertType, 'overdue' | 'upcoming'>
): Promise<{ sent: number; errors: number; type: string }> {
  await verifyOrganizationMember(organizationId, userId)

  const [user] = await db
    .select({ name: users.name, phone: users.phone })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  if (!user) {
    throw notFound('User not found')
  }

  const phone = normalizePhone(user.phone)
  if (!phone) {
    throw badRequest('Telefone do usuário vazio')
  }

  const targetKey = personKey({ userId, contactName: null, contactPhone: null })
  return sendManualAlertsForTarget(splitRepository, {
    organizationId,
    targetKey,
    recipientName: user.name ?? 'você',
    phone,
    type,
  })
}

export async function sendManualContactAlerts(
  splitRepository: SplitRepository,
  organizationId: string,
  targetKey: string,
  type: Extract<ManualAlertType, 'overdue' | 'upcoming'>
): Promise<{ sent: number; errors: number; type: string }> {
  if (!targetKey.startsWith('contact:')) {
    throw badRequest('Invalid contact target')
  }

  const activeSplits = await splitRepository.listActivePendingSplits(organizationId)
  const matchingSplits = activeSplits.filter(
    split => !split.userId && personKey(split) === targetKey
  )

  if (matchingSplits.length === 0) {
    throw notFound('Contact not found')
  }

  const sample = matchingSplits[0] as NonNullable<(typeof matchingSplits)[0]>
  const phone = normalizePhone(sample.contactPhone)
  if (!phone) {
    throw badRequest('Telefone do contato vazio')
  }

  return sendManualAlertsForTarget(splitRepository, {
    organizationId,
    targetKey,
    recipientName: sample.contactName ?? 'você',
    phone,
    type,
  })
}
