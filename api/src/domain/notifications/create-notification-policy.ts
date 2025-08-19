import { db } from '@/db'
import { notificationPolicies } from '@/db/schemas/notificationPolicies'

export interface CreateNotificationPolicyRequest {
  orgId: string
  scope: 'transaction' | 'goal'
  event: 'due_soon' | 'overdue'
  daysBefore?: number | null
  daysOverdue?: number | null
  repeatEveryMinutes?: number | null
  maxOccurrences?: number | null
  channels: string
  active?: boolean
}

export async function createNotificationPolicyService({
  orgId,
  scope,
  event,
  daysBefore,
  daysOverdue,
  repeatEveryMinutes,
  maxOccurrences,
  channels,
  active = true,
}: CreateNotificationPolicyRequest) {
  const [policy] = await db
    .insert(notificationPolicies)
    .values({
      orgId,
      scope,
      event,
      daysBefore,
      daysOverdue,
      repeatEveryMinutes,
      maxOccurrences,
      channels,
      active,
    })
    .returning({
      id: notificationPolicies.id,
      scope: notificationPolicies.scope,
      event: notificationPolicies.event,
      days_before: notificationPolicies.daysBefore,
      days_overdue: notificationPolicies.daysOverdue,
      repeat_every_minutes: notificationPolicies.repeatEveryMinutes,
      max_occurrences: notificationPolicies.maxOccurrences,
      channels: notificationPolicies.channels,
      active: notificationPolicies.active,
    })

  return { policy }
}
