import { createId } from '@paralleldrive/cuid2'

import { env } from '@/config/env'
import { db } from '@/db'
import { invites } from '@/db/schemas/invites'
import { getOrganizationById } from '../organization/get-organization-by-slug'
import { sendInviteMail } from '../send-invite-mail'

interface CreateInviteRequest {
  email: string
  orgId: string
  userId: string
}

export async function createInvite({ email, userId, orgId }: CreateInviteRequest) {
  const { organization } = await getOrganizationById({ orgId })
  if (!organization) {
    throw new Error('Organization not found')
  }

  const token = createId()

  const [invite] = await db
    .insert(invites)
    .values({
      organizationId: organization.id,
      email,
      userId,
    })
    .returning()

  const url = new URL(`${env.WEB_URL}/invites/accept`)
  url.searchParams.set('token', token)

  await sendInviteMail({ email, url: url.toString() })

  return { invite }
}
