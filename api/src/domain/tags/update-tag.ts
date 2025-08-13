import { and, eq } from 'drizzle-orm'
import { PostgresError } from 'postgres'

import { db } from '@/db'
import { tags } from '@/db/schemas/tags'
import { TagAlreadyExistsError } from '@/http/utils/error'

interface UpdateTagRequest {
  id: string
  orgId: string
  name: string
  color: string
}

export async function updateTagService({ id, orgId, name, color }: UpdateTagRequest) {
  try {
    const [tag] = await db
      .update(tags)
      .set({ name, color, updatedAt: new Date() })
      .where(and(eq(tags.id, id), eq(tags.organizationId, orgId)))
      .returning()

    return { tag }
  } catch (err) {
    const cause = (err as { cause?: unknown }).cause

    if (cause instanceof PostgresError && cause.code === '23505') {
      throw new TagAlreadyExistsError()
    }

    throw err
  }
}
