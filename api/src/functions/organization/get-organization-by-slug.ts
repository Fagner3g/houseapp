import { eq } from 'drizzle-orm'

import { db } from '@/db'
import { organizations } from '@/db/schema'

interface GetOrganizationBySlugRequest {
  slug: string
}

export async function getOrganizationBySlug({ slug }: GetOrganizationBySlugRequest) {
  const result = await db
    .select()
    .from(organizations)
    .where(eq(organizations.slug, slug))
    .limit(1)

  return { organization: result[0] }
}
