import { eq } from 'drizzle-orm'

import { db } from '@/db'
import { organizations } from '@/db/schemas/organizations'

import {
  DEFAULT_NOTIFY_HOUR,
  DEFAULT_NOTIFY_MINUTE,
  formatNotifyTime,
} from './alert-utils'

export type AlertSettings = {
  defaultNotifyHour: number
  defaultNotifyMinute: number
  timezone: 'America/Sao_Paulo'
  notifyTimeLabel: string
}

export type UpdateAlertSettingsInput = {
  defaultNotifyHour: number
  defaultNotifyMinute: number
}

export class AlertSettingsService {
  async get(organizationId: string): Promise<AlertSettings> {
    const [organization] = await db
      .select({
        defaultNotifyHour: organizations.defaultNotifyHour,
        defaultNotifyMinute: organizations.defaultNotifyMinute,
      })
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1)

    const defaultNotifyHour = organization?.defaultNotifyHour ?? DEFAULT_NOTIFY_HOUR
    const defaultNotifyMinute = organization?.defaultNotifyMinute ?? DEFAULT_NOTIFY_MINUTE

    return {
      defaultNotifyHour,
      defaultNotifyMinute,
      timezone: 'America/Sao_Paulo',
      notifyTimeLabel: formatNotifyTime(defaultNotifyHour, defaultNotifyMinute),
    }
  }

  async update(organizationId: string, input: UpdateAlertSettingsInput): Promise<AlertSettings> {
    const [updated] = await db
      .update(organizations)
      .set({
        defaultNotifyHour: input.defaultNotifyHour,
        defaultNotifyMinute: input.defaultNotifyMinute,
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, organizationId))
      .returning({
        defaultNotifyHour: organizations.defaultNotifyHour,
        defaultNotifyMinute: organizations.defaultNotifyMinute,
      })

    const defaultNotifyHour = updated?.defaultNotifyHour ?? input.defaultNotifyHour
    const defaultNotifyMinute = updated?.defaultNotifyMinute ?? input.defaultNotifyMinute

    return {
      defaultNotifyHour,
      defaultNotifyMinute,
      timezone: 'America/Sao_Paulo',
      notifyTimeLabel: formatNotifyTime(defaultNotifyHour, defaultNotifyMinute),
    }
  }
}
