import { eq } from 'drizzle-orm'
import slugify from 'slugify'

import { db } from '@/db'
import { invites, organizations, userOrganizations, users } from '@/db/schema'
import { env } from '@/env'
import { AuthenticateUser } from '@/modules/auth'
import { SendMail } from '../send-mail'
import { SendWhats } from '../sendWhats'

interface CreateNewUserRequest {
  name: string
  email: string
  ddd: string
  phone: string
  avatarUrl: string
  inviteToken?: string
}

export async function createNewUser({
  name,
  email,
  ddd,
  phone,
  avatarUrl,
  inviteToken,
}: CreateNewUserRequest) {
  let organizationId: string | null = null

  if (inviteToken) {
    const [invite] = await db.select().from(invites).where(eq(invites.token, inviteToken)).limit(1)

    if (!invite) {
      throw new Error('Invite not found')
    }

    organizationId = invite.organizationId

    await db.update(invites).set({ acceptedAt: new Date() }).where(eq(invites.id, invite.id))
  } else {
    const [organization] = await db
      .insert(organizations)
      .values({ name: `${name}'s House`, slug: slugify(`${name}-house`, { lower: true }) })
      .returning()

    organizationId = organization.id
  }

  const [user] = await db
    .insert(users)
    .values({
      name,
      email,
      phone,
      ddd,
      avatarUrl,
      defaultOrganizationId: organizationId,
    })
    .returning()

  await db.insert(userOrganizations).values({
    userId: user.id,
    organizationId,
  })

  const token = await AuthenticateUser(user.id)

  const url = new URL(`${env.WEB_URL}/validate-link`)
  url.searchParams.set('token', token)

  await SendMail({ name, email, ddd, phone, url: url.toString() })

  await SendWhats({ name, ddd, phone })
}
