import { env } from '@/config/env'
import { db } from '@/db'
import { userOrganizations } from '@/db/schemas/userOrganization'
import { users } from '@/db/schemas/users'
import { AuthenticateUser } from '@/http/utils/auth'
import { createOrganization } from '../organization/create-organization'
import { SendMail } from '../send-mail'
import { SendWhats } from '../sendWhats'

interface CreateNewUserRequest {
  name: string
  email: string
  ddd: string
  phone: string
  avatarUrl: string
  ownerId: string
  inviteToken?: string
}

export async function signUp({
  name,
  email,
  ddd,
  phone,
  avatarUrl,
  ownerId,
}: CreateNewUserRequest) {
  let organizationId: string | null = null

  const { organization } = await createOrganization({ name, isFirstOrg: true, ownerId })
  organizationId = organization.id

  const [user] = await db
    .insert(users)
    .values({
      name,
      email,
      phone,
      ddd,
      avatarUrl,
    })
    .returning()

  await db.insert(userOrganizations).values({
    userId: user.id,
    organizationId,
  })

  const token = await AuthenticateUser(user.id)

  const url = new URL(`${env.WEB_URL}/validate`)
  url.searchParams.set('token', token)

  await SendMail({ name, email, ddd, phone, url: url.toString() })

  await SendWhats({ name, ddd, phone })
}
