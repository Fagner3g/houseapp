import { PostgresError } from 'postgres'
import slugify from 'slugify'

import { db } from '@/db'
import { organizations } from '@/db/schemas/organization'

interface CreateOrganization {
  name: string
  isFirstOrg: boolean
  ownerId: string
}

export async function createOrganization({ name, isFirstOrg, ownerId }: CreateOrganization) {
  let attempt = 0
  const base = slugify(name, { lower: true, remove: /[*+~.()'"!:@]/g })

  while (true) {
    const slug = attempt === 0 ? base : `${base}-${attempt}`

    try {
      const [organization] = await db
        .insert(organizations)
        .values({
          ownerId,
          name: isFirstOrg ? 'My House' : `${name.split(' ')[0]} House`,
          slug,
        })
        .returning()

      return { organization }
    } catch (err) {
      const cause = (err as { cause?: unknown }).cause

      if (cause instanceof PostgresError) {
        if (cause.code === '23505') {
          attempt++
          continue
        }
      }
      // Case of some other error
      throw err
    }
  }
}
