import { createId } from '@paralleldrive/cuid2'

import { env } from '@/config/env'
import { db } from '@/db'
import { invites } from '@/db/schemas/invites'
import { getOrganizationById } from '../organization/get-organization-by-slug'
import { sendInviteMail } from '../send-invite-mail'

interface CreateInviteRequest {
  email: string
  organizationSlug: string
}

export async function createInvite({ email, organizationSlug }: CreateInviteRequest) {
  const { organization } = await getOrganizationById({ slug: organizationSlug })
  if (!organization) {
    throw new Error('Organization not found')
  }

  const token = createId()

  const [invite] = await db
    .insert(invites)
    .values({
      organizationId: organization.id,
      email,
      token,
    })
    .returning()

  const url = new URL(`${env.WEB_URL}/invite`)
  url.searchParams.set('token', token)

  await sendInviteMail({ email, url: url.toString() })

  return { invite }
}
