import { http } from '@/lib/http'

export type SystemNotificationSettings = {
  notificationsEnabled: boolean
  updatedAt: string
}

export async function getSystemNotificationSettings(
  slug: string
): Promise<SystemNotificationSettings> {
  return http<SystemNotificationSettings>(
    `/organizations/${slug}/system-settings/notifications`,
    { method: 'GET' }
  )
}

export async function updateSystemNotificationSettings(
  slug: string,
  notificationsEnabled: boolean
): Promise<SystemNotificationSettings> {
  return http<SystemNotificationSettings>(
    `/organizations/${slug}/system-settings/notifications`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notificationsEnabled }),
    }
  )
}
