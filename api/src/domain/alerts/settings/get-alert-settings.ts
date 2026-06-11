import { eq } from 'drizzle-orm'

import { db } from '@/db'
import { organizations } from '@/db/schemas/organization'
import { BadRequestError } from '@/http/utils/error'
import type { AlertSettingsDto } from '../types'

export async function getAlertSettingsService(orgId: string): Promise<{ settings: AlertSettingsDto }> {
  const [org] = await db
    .select({
      defaultNotifyHour: organizations.defaultNotifyHour,
      defaultNotifyMinute: organizations.defaultNotifyMinute,
    })
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1)

  if (!org) {
    throw new BadRequestError('Organization not found')
  }

  return {
    settings: {
      defaultNotifyHour: org.defaultNotifyHour,
      defaultNotifyMinute: org.defaultNotifyMinute,
    },
  }
}
