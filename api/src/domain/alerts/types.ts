import type { ReminderChannel } from '@/db/schemas/customReminders'
import type {
  AlertRuleChannel,
  AlertRuleConfig,
  AlertRuleKind,
  AlertRuleRecipient,
  AlertRuleScope,
} from '@/db/schemas/alertRules'

export type ReminderRecurrenceType = 'weekly' | 'monthly' | 'yearly'

export type ReminderDto = {
  id: string
  organizationId: string
  createdBy: string
  title: string
  notes: string | null
  dueDate: string
  amountCents: number | null
  daysBefore: number[]
  channels: ReminderChannel[]
  recipientUserId: string
  recipientName: string | null
  active: boolean
  completedAt: string | null
  isRecurring: boolean
  recurrenceType: ReminderRecurrenceType | null
  recurrenceInterval: number
  recurrenceUntil: string | null
  notifyHour: number | null
  notifyMinute: number | null
  linkedSeriesId: string | null
  snoozedUntil: string | null
  lastCompletedPeriodKey: string | null
  createdAt: string
  updatedAt: string
}

export type AlertSettingsDto = {
  defaultNotifyHour: number
  defaultNotifyMinute: number
}

export type AlertDeliveryDto = {
  id: string
  organizationId: string
  userId: string
  recipientName?: string | null
  sourceType: 'rule' | 'reminder' | 'investment'
  ruleId: string | null
  reminderId: string | null
  occurrenceId: string | null
  kind: string
  channel: 'in_app' | 'whatsapp' | 'extension'
  channels?: ('in_app' | 'whatsapp' | 'extension')[]
  status: 'pending' | 'sent' | 'failed' | 'skipped'
  payload: Record<string, unknown>
  sentAt: string | null
  readAt: string | null
  ackedAt: string | null
  createdAt: string
  orgSlug?: string
  orgName?: string
}

export type AlertRuleDto = {
  id: string
  organizationId: string
  scope: AlertRuleScope
  seriesId: string | null
  kind: AlertRuleKind
  config: AlertRuleConfig
  channels: AlertRuleChannel[]
  recipients: AlertRuleRecipient
  active: boolean
  createdBy: string
  createdAt: string
  updatedAt: string
  seriesTitle?: string | null
}

export type RulePreviewItem = {
  ruleId: string
  kind: AlertRuleKind
  occurrenceId: string
  seriesId: string
  title: string
  dueDate: string
  daysUntilDue?: number
  overdueDays?: number
  amountCents: number
  channels: AlertRuleChannel[]
  recipientUserId: string
  recipientName: string | null
}

export type ReminderPreviewItem = {
  reminderId: string
  title: string
  dueDate: string
  kind: 'upcoming' | 'overdue'
  daysUntilDue: number
  overdueDays?: number
  amountCents: number | null
  notifyHour: number
  notifyMinute: number
  channels: ReminderChannel[]
  recipientUserId: string
  recipientName: string | null
}

export type ReminderPreviewSkipReason = 'snoozed' | 'no_matching_rule' | 'period_completed'

export type ReminderPreviewSkipItem = {
  reminderId: string
  title: string
  reason: ReminderPreviewSkipReason
  daysUntilDue: number
  notifyHour: number
  notifyMinute: number
  snoozedUntil?: string
}
