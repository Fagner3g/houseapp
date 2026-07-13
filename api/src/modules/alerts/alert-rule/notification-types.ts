import type { AlertRuleChannel } from '@/db/schemas/alertRules'

import type { AlertRuleRecord } from '../alert-rule.repository'

export type CreateUserNotificationParams = {
  rule: AlertRuleRecord
  userId: string
  transactionId: string | null
  accountId: string | null
  organizationId: string
  title: string
  body: string
  daysUntilDue: number
  daysBefore: number
  dedupeKeyBuilder: (userId: string, channel: AlertRuleChannel) => string
  metadata: Record<string, unknown>
  skipDedupe?: boolean
}

export type CreateExternalNotificationParams = {
  rule: AlertRuleRecord
  transactionId: string
  phone: string
  contactName: string | null
  title: string
  body: string
  dedupeKey: string
  metadata: Record<string, unknown>
  onSent?: () => Promise<void>
}
