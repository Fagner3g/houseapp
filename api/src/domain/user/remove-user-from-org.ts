import { and, eq, ne, sql } from 'drizzle-orm'

import { db } from '@/db'
import { alertDeliveries } from '@/db/schemas/alertDeliveries'
import { alertRules } from '@/db/schemas/alertRules'
import { customReminders } from '@/db/schemas/customReminders'
import { invites } from '@/db/schemas/invites'
import { organizations } from '@/db/schemas/organization'
import { transactionChatMessages } from '@/db/schemas/transactionChatMessages'
import { userOrganizations } from '@/db/schemas/userOrganization'
import { users } from '@/db/schemas/users'
import { BadRequestError } from '@/http/utils/error'

import { countActiveTransactionRefsInOrg } from './count-active-transaction-refs-in-org'
import { countTransactionRefsInOrg } from './count-transaction-refs-in-org'

export type RemoveUserMode = 'deactivate' | 'delete'

type DbExecutor = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0]

interface RemoveUserFromOrgInput {
  orgId: string
  targetUserId: string
  requesterUserId: string
  mode: RemoveUserMode
}

async function cleanupUserReferencesForDeletion(
  trx: DbExecutor,
  orgId: string,
  targetUserId: string,
  fallbackUserId: string
) {
  await trx
    .update(customReminders)
    .set({ recipientUserId: fallbackUserId })
    .where(
      and(
        eq(customReminders.organizationId, orgId),
        eq(customReminders.recipientUserId, targetUserId)
      )
    )

  await trx
    .update(customReminders)
    .set({ createdBy: fallbackUserId })
    .where(
      and(eq(customReminders.organizationId, orgId), eq(customReminders.createdBy, targetUserId))
    )

  await trx
    .update(alertRules)
    .set({ createdBy: fallbackUserId })
    .where(and(eq(alertRules.organizationId, orgId), eq(alertRules.createdBy, targetUserId)))

  await trx.delete(alertDeliveries).where(eq(alertDeliveries.userId, targetUserId))
  await trx.delete(transactionChatMessages).where(eq(transactionChatMessages.userId, targetUserId))
  await trx.delete(invites).where(eq(invites.userId, targetUserId))
}

export async function removeUserFromOrg({
  orgId,
  targetUserId,
  requesterUserId,
  mode,
}: RemoveUserFromOrgInput) {
  if (targetUserId === requesterUserId) {
    throw new BadRequestError('Você não pode remover sua própria conta')
  }

  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, orgId),
    columns: { ownerId: true },
  })

  if (!org) {
    throw new BadRequestError('Organização não encontrada')
  }

  if (org.ownerId === targetUserId) {
    throw new BadRequestError('Não é possível remover o administrador da organização')
  }

  const membership = await db.query.userOrganizations.findFirst({
    where: and(
      eq(userOrganizations.organizationId, orgId),
      eq(userOrganizations.userId, targetUserId)
    ),
    columns: { userId: true },
  })

  const [{ count: remainingMemberships }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(userOrganizations)
    .where(eq(userOrganizations.userId, targetUserId))

  if (!membership) {
    if (mode !== 'delete' || remainingMemberships > 0) {
      throw new BadRequestError('Usuário não encontrado na organização')
    }
  }

  if (mode === 'deactivate') {
    const activeTransactionRefs = await countActiveTransactionRefsInOrg(orgId, targetUserId)

    if (activeTransactionRefs > 0) {
      throw new BadRequestError(
        'Usuário possui transações ativas associadas nesta organização e não pode ser desativado. Reatribua ou encerre as transações antes de remover o acesso.'
      )
    }
  }

  if (mode === 'delete') {
    const transactionRefs = await countTransactionRefsInOrg(orgId, targetUserId)

    if (transactionRefs > 0) {
      throw new BadRequestError(
        'Usuário possui transações associadas nesta organização e não pode ser excluído permanentemente. Reatribua as transações e use desativar para remover o acesso.'
      )
    }

    const [{ count: otherMemberships }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(userOrganizations)
      .where(
        and(
          eq(userOrganizations.userId, targetUserId),
          ne(userOrganizations.organizationId, orgId)
        )
      )

    if (otherMemberships > 0) {
      throw new BadRequestError(
        'Usuário pertence a outras organizações. Use desativar para remover o acesso apenas desta organização.'
      )
    }

    const ownedOrgs = await db.query.organizations.findMany({
      where: eq(organizations.ownerId, targetUserId),
      columns: { id: true },
    })

    if (ownedOrgs.length > 0) {
      throw new BadRequestError(
        'Usuário é administrador de organizações e não pode ser excluído permanentemente'
      )
    }
  }

  return db.transaction(async trx => {
    if (membership) {
      await trx
        .delete(userOrganizations)
        .where(
          and(
            eq(userOrganizations.organizationId, orgId),
            eq(userOrganizations.userId, targetUserId)
          )
        )
    }

    if (mode === 'deactivate') {
      return { mode: 'deactivate' as const }
    }

    await cleanupUserReferencesForDeletion(trx, orgId, targetUserId, org.ownerId)
    await trx.delete(users).where(eq(users.id, targetUserId))

    return { mode: 'delete' as const }
  })
}
