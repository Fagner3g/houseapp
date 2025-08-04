import { eq } from 'drizzle-orm'

import { db } from '@/db'
import { organizations } from '@/db/schemas/organization'

interface GetOrganizationById {
  orgId: string
}

export async function getOrganizationById({ orgId }: GetOrganizationById) {
  const result = await db.select().from(organizations).where(eq(organizations.id, orgId)).limit(1)

  return { organization: result[0] }
}
