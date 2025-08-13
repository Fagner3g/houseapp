import { eq } from 'drizzle-orm'

import { db } from '@/db'
import { invites } from '@/db/schemas/invites'
import { organizations } from '@/db/schemas/organization'
import { userOrganizations } from '@/db/schemas/userOrganization'
import { users } from '@/db/schemas/users'
import type { CreateInviteRequest, GetInviteRequest } from './models'

async function createInvite({ email, userId, orgId }: CreateInviteRequest) {
  const [invite] = await db
    .insert(invites)
    .values({
      organizationId: orgId,
      email,
      userId,
    })
    .returning()

  await db
    .insert(userOrganizations)
    .values({
      userId,
      organizationId: orgId,
    })
    .returning()

  return { invite }
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
    .innerJoin(users, eq(invites.userId, users.id))
    .where(eq(invites.email, email))

  return { invites: resp }
}

export const inviteService = {
  create: createInvite,
  getInvites,
}
