import { eq } from 'drizzle-orm'

import { db } from '@/db'
import { invites, organizations } from '@/db/schema'

interface GetInviteRequest {
  token: string
}

export async function getInvite({ token }: GetInviteRequest) {
  const [invite] = await db
    .select({
      id: invites.id,
      email: invites.email,
      organizationId: invites.organizationId,
      token: invites.token,
      acceptedAt: invites.acceptedAt,
      createdAt: invites.createdAt,
      organizationSlug: organizations.slug,
    })
    .from(invites)
    .leftJoin(organizations, eq(invites.organizationId, organizations.id))
    .where(eq(invites.token, token))
    .limit(1)

  return { invite }
}
