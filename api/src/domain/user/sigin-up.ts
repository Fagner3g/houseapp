import { eq } from 'drizzle-orm'

import { env } from '@/config/env'
import { db } from '@/db'
import { invites } from '@/db/schemas/invites'
import { userOrganizations } from '@/db/schemas/userOrganization'
import { users } from '@/db/schemas/users'
import { AuthenticateUser } from '@/http/utils/auth'
import { BadRequestError } from '@/http/utils/error'
import { createOrganization } from '../organization/create-organization'
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

export async function signUp({
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
      throw new BadRequestError('Invite not found')
    }

    organizationId = invite.organizationId

    await db.update(invites).set({ acceptedAt: new Date() }).where(eq(invites.id, invite.id))
  } else {
    const { organization } = await createOrganization({ name, isFirstOrg: true })
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
