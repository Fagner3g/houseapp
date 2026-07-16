import { eq, sql } from 'drizzle-orm'

import { db } from '@/db'
import { invites } from '@/db/schemas/invites'
import { organizationMembers } from '@/db/schemas/organizationMembers'
import { organizations } from '@/db/schemas/organizations'
import { users } from '@/db/schemas/users'
import type { CreateInviteRequest, GetInviteRequest } from './models'

/**
 * Creates an invite and, when the email already belongs to a user,
 * adds that user to the organization (not the inviter).
 *
 * `userId` is the inviter (`invitedBy`).
 */
async function createInvite({ email, userId, orgId }: CreateInviteRequest) {
  const normalizedEmail = email.trim().toLowerCase()

  const [invite] = await db
    .insert(invites)
    .values({
      organizationId: orgId,
      email: normalizedEmail,
      invitedBy: userId,
    })
    .returning()

  const [invitee] = await db
    .select({ id: users.id })
    .from(users)
    .where(sql`lower(${users.email}) = ${normalizedEmail}`)
    .limit(1)

  if (invitee) {
    await db
      .insert(organizationMembers)
      .values({
        userId: invitee.id,
        organizationId: orgId,
        role: 'member',
      })
      .onConflictDoNothing()
  }

  return { invite, inviteeId: invitee?.id ?? null }
}

async function getInvites({ email }: GetInviteRequest) {
  const resp = await db
    .select({
      id: invites.id,
      email: invites.email,
      organization: organizations.name,
      slug: organizations.slug,
      owner: users.name,
    })
    .from(invites)
    .leftJoin(organizations, eq(invites.organizationId, organizations.id))
    .innerJoin(users, eq(invites.invitedBy, users.id))
    .where(sql`lower(${invites.email}) = ${email.trim().toLowerCase()}`)

  return { invites: resp }
}

export const inviteService = {
  create: createInvite,
  getInvites,
}
