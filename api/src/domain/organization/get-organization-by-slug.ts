import { eq } from 'drizzle-orm'

import { db } from '@/db'
import { organizations } from '@/db/schemas/organization'

interface GetOrganizationById {
  idOrg: string
}

export async function getOrganizationById({ idOrg }: GetOrganizationById) {
  const result = await db.select().from(organizations).where(eq(organizations.id, idOrg)).limit(1)

  return { organization: result[0] }
}
