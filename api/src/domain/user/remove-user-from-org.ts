import { and, eq, ne, sql } from 'drizzle-orm'

import { db } from '@/db'
import { organizations } from '@/db/schemas/organization'
import { userOrganizations } from '@/db/schemas/userOrganization'
import { users } from '@/db/schemas/users'
import { BadRequestError } from '@/http/utils/error'

import { countActiveTransactionRefsInOrg } from './count-active-transaction-refs-in-org'

export type RemoveUserMode = 'deactivate' | 'delete'

interface RemoveUserFromOrgInput {
  orgId: string
  targetUserId: string
  requesterUserId: string
  mode: RemoveUserMode
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

  if (!membership) {
    throw new BadRequestError('Usuário não encontrado na organização')
  }

  const activeTransactionRefs = await countActiveTransactionRefsInOrg(orgId, targetUserId)

  if (activeTransactionRefs > 0) {
    throw new BadRequestError(
      mode === 'delete'
        ? 'Usuário possui transações ativas associadas nesta organização e não pode ser excluído permanentemente. Reatribua ou encerre as transações antes de remover.'
        : 'Usuário possui transações ativas associadas nesta organização e não pode ser desativado. Reatribua ou encerre as transações antes de remover o acesso.'
    )
  }

  if (mode === 'delete') {
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

  await db
    .delete(userOrganizations)
    .where(
      and(
        eq(userOrganizations.organizationId, orgId),
        eq(userOrganizations.userId, targetUserId)
      )
    )

  if (mode === 'deactivate') {
    return { mode: 'deactivate' as const }
  }

  await db.delete(users).where(eq(users.id, targetUserId))

  return { mode: 'delete' as const }
}
