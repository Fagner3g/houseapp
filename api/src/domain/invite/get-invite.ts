import { eq } from 'drizzle-orm'

import { db } from '@/db'
import { invites } from '@/db/schemas/invites'
import { organizations } from '@/db/schemas/organization'
import { users } from '@/db/schemas/users'

interface GetInviteRequest {
  email: string
}

export async function getInvites({ email }: GetInviteRequest) {
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
