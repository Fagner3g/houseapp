import { http } from '@/lib/http'

export type ManualAlertType = 'overdue' | 'upcoming' | 'monthly-summary'

export type SendManualAlertResult = {
  sent: number
  errors: number
  type: ManualAlertType
}

export async function sendManualAlert(
  slug: string,
  targetKey: string,
  type: ManualAlertType
): Promise<SendManualAlertResult> {
  return http<SendManualAlertResult>(`/organizations/${slug}/alerts/send-manual`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ targetKey, type }),
  })
}
