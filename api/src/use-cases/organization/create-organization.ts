import slugify from 'slugify'

import { db } from '@/db'
import { organizations, userOrganizations } from '@/db/schema'

interface CreateOrganizationRequest {
  name: string
  userId: string
}

export async function createOrganization({ name, userId }: CreateOrganizationRequest) {
  const [organization] = await db
    .insert(organizations)
    .values({ name, slug: slugify(name, { lower: true }) })
    .returning()

  await db.insert(userOrganizations).values({
    userId,
    organizationId: organization.id,
  })

  return { organization }
}
