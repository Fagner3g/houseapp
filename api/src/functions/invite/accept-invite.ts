import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { invites, userOrganizations } from '@/db/schema'

interface AcceptInviteRequest {
  token: string
  userId: string
}

export async function acceptInvite({ token, userId }: AcceptInviteRequest) {
  const [invite] = await db.select().from(invites).where(eq(invites.token, token)).limit(1)
  if (!invite) {
    throw new Error('Invite not found')
  }

  if (invite.acceptedAt) {
    throw new Error('Invite already accepted')
  }

  await db.insert(userOrganizations).values({
    userId,
    organizationId: invite.organizationId,
  })

  await db.update(invites).set({ acceptedAt: new Date() }).where(eq(invites.id, invite.id))

  return { invite }
}
