import { and, eq } from 'drizzle-orm'

import { db } from '@/db'
import { tags } from '@/db/schemas/tags'

interface DeleteTagRequest {
  id: string
  orgId: string
}

export async function deleteTagService({ id, orgId }: DeleteTagRequest) {
  await db.delete(tags).where(and(eq(tags.id, id), eq(tags.organizationId, orgId)))
}
