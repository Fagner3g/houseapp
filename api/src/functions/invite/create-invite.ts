import { createId } from '@paralleldrive/cuid2'
import { db } from '@/db'
import { invites } from '@/db/schema'
import { getOrganizationBySlug } from '../organization/get-organization-by-slug'

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

  return { invite }
}
