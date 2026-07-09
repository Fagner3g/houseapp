import { http } from '@/lib/http'

export type ManualAlertTarget = {
  key: string
  name: string
  type: 'member' | 'contact'
  phone: string | null
  userId: string | null
}

export async function listManualAlertTargets(
  slug: string
): Promise<{ targets: ManualAlertTarget[] }> {
  return http<{ targets: ManualAlertTarget[] }>(
    `/organizations/${slug}/alerts/manual-targets`,
    { method: 'GET' }
  )
}
