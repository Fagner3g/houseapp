import { http } from '@/lib/http'

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

export function toTimeInputValue(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

export function parseTimeInputValue(value: string): UpdateAlertSettingsInput | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value)
  if (!match) return null

  const defaultNotifyHour = Number(match[1])
  const defaultNotifyMinute = Number(match[2])

  if (
    defaultNotifyHour < 0 ||
    defaultNotifyHour > 23 ||
    defaultNotifyMinute < 0 ||
    defaultNotifyMinute > 59
  ) {
    return null
  }

  return { defaultNotifyHour, defaultNotifyMinute }
}

export async function getAlertSettings(slug: string): Promise<AlertSettings> {
  return http<AlertSettings>(`/organizations/${slug}/alert-settings`, {
    method: 'GET',
  })
}

export async function updateAlertSettings(
  slug: string,
  input: UpdateAlertSettingsInput
): Promise<AlertSettings> {
  return http<AlertSettings>(`/organizations/${slug}/alert-settings`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
}
