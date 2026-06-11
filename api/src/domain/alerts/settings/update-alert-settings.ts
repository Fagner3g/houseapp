import { eq } from 'drizzle-orm'

import { db } from '@/db'
import { organizations } from '@/db/schemas/organization'
import { BadRequestError } from '@/http/utils/error'
import type { AlertSettingsDto } from '../types'

interface UpdateAlertSettingsRequest {
  orgId: string
  defaultNotifyHour: number
  defaultNotifyMinute: number
}

export async function updateAlertSettingsService({
  orgId,
  defaultNotifyHour,
  defaultNotifyMinute,
}: UpdateAlertSettingsRequest): Promise<{ settings: AlertSettingsDto }> {
  const [org] = await db
    .update(organizations)
    .set({
      defaultNotifyHour,
      defaultNotifyMinute,
      updatedAt: new Date(),
    })
    .where(eq(organizations.id, orgId))
    .returning({
      defaultNotifyHour: organizations.defaultNotifyHour,
      defaultNotifyMinute: organizations.defaultNotifyMinute,
    })

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
