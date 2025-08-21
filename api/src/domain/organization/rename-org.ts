import { eq } from 'drizzle-orm'

import { db } from '@/db'
import { organizations } from '@/db/schemas/organization'

interface RenameOrg {
  orgId: string
  name: string
  description?: string
}

export async function renameOrg({ orgId, name, description }: RenameOrg) {
  const [organization] = await db
    .update(organizations)
    .set({ name, description, updatedAt: new Date() })
    .where(eq(organizations.id, orgId))
    .returning()

  return { organization }
}
