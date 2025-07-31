import { createId } from '@paralleldrive/cuid2'

import { db } from '@/db'
import { invites } from '@/db/schema'
import { env } from '@/env'
import { getOrganizationBySlug } from '../organization/get-organization-by-slug'
import { sendInviteMail } from '../send-invite-mail'

interface CreateInviteRequest {
  email: string
  organizationSlug: string
}

export async function createInvite({ email, organizationSlug }: CreateInviteRequest) {
  const { organization } = await getOrganizationBySlug({ slug: organizationSlug })
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
