import { eq } from 'drizzle-orm'

import { db } from '@/db'
import { tags } from '@/db/schemas/tags'

interface ListTagsRequest {
  orgId: string
}

export async function listTagsService({ orgId }: ListTagsRequest) {
  const result = await db
    .select({ id: tags.id, name: tags.name, color: tags.color })
    .from(tags)
    .where(eq(tags.organizationId, orgId))
    .orderBy(tags.name)

  return { tags: result }
}
