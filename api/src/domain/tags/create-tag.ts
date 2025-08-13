import { PostgresError } from 'postgres'
import { db } from '@/db'
import { tags } from '@/db/schemas/tags'
import { TagAlreadyExistsError } from '@/http/utils/error'

interface CreateTagRequest {
  orgId: string
  name: string
  color: string
}

export async function createTagService({ orgId, name, color }: CreateTagRequest) {
  try {
    const [tag] = await db
      .insert(tags)
      .values({ organizationId: orgId, name, color })
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
