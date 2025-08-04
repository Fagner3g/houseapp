import { eq } from 'drizzle-orm'

import { db } from '@/db'
import { organizations } from '@/db/schemas/organization'

interface RenameOrg {
  orgId: string
  name: string
}

export async function renameOrg({ orgId, name }: RenameOrg) {
  const [organization] = await db
    .update(organizations)
    .set({ name, updatedAt: new Date() })
    .where(eq(organizations.id, orgId))
    .returning()

  return { organization }
}
