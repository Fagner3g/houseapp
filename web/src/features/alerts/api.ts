import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { http } from '@/lib/http'

export type ReminderChannel = 'in_app' | 'whatsapp' | 'extension'
export type ReminderRecurrenceType = 'weekly' | 'monthly' | 'yearly'

export type Reminder = {
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
  createdAt: string
  updatedAt: string
}

export type AlertSettings = {
  defaultNotifyHour: number
  defaultNotifyMinute: number
}

export type AlertDelivery = {
  id: string
  organizationId: string
  userId: string
  sourceType: 'rule' | 'reminder' | 'investment'
  ruleId: string | null
  reminderId: string | null
  occurrenceId: string | null
  kind: string
  channel: ReminderChannel
  status: 'pending' | 'sent' | 'failed' | 'skipped'
  payload: Record<string, unknown>
  sentAt: string | null
  readAt: string | null
  ackedAt: string | null
  createdAt: string
}

export type ReminderPreviewItem = {
  reminderId: string
  title: string
  dueDate: string
  daysUntilDue: number
  amountCents: number | null
  notifyHour: number
  notifyMinute: number
  channels: ReminderChannel[]
  recipientUserId: string
  recipientName: string | null
}

export type ReminderPreviewSkipReason = 'snoozed' | 'no_matching_day'

export type ReminderPreviewSkipItem = {
  reminderId: string
  title: string
  reason: ReminderPreviewSkipReason
  daysUntilDue: number
  notifyHour: number
  notifyMinute: number
  snoozedUntil?: string
}

export type RulePreviewItem = {
  ruleId: string
  kind: 'upcoming' | 'overdue'
  occurrenceId: string
  seriesId: string
  title: string
  dueDate: string
  daysUntilDue?: number
  overdueDays?: number
  amountCents: number
  channels: ReminderChannel[]
  recipientUserId: string
  recipientName: string | null
}

export type InvestmentPreviewItem = {
  assetId: string
  planId: string
  referenceMonth: string
  assetSymbol: string
  assetName: string
  dueDate: string
  plannedAmount: number | null
  plannedQuantity: number | null
  status: 'pending' | 'overdue'
  recipientUserId: string
  recipientName: string | null
}

export type AlertsPreview = {
  defaultNotifyHour: number
  defaultNotifyMinute: number
  reminders: ReminderPreviewItem[]
  skippedReminders: ReminderPreviewSkipItem[]
  rules: RulePreviewItem[]
  investments: InvestmentPreviewItem[]
}

export type CreateReminderInput = {
  title: string
  notes?: string | null
  dueDate: string
  amountCents?: number | null
  daysBefore: number[]
  channels: ReminderChannel[]
  recipientUserId: string
  isRecurring?: boolean
  recurrenceType?: ReminderRecurrenceType | null
  recurrenceInterval?: number
  recurrenceUntil?: string | null
  notifyHour?: number | null
  notifyMinute?: number | null
}

export type UpdateReminderInput = Partial<CreateReminderInput> & {
  active?: boolean
  linkedSeriesId?: string | null
}

export type AlertRuleChannel = ReminderChannel
export type AlertRuleKind = 'upcoming' | 'overdue'
export type AlertRuleRecipient = 'owner' | 'pay_to' | 'both' | 'none'

export type UpcomingRuleConfig = { daysBefore: number[] }
export type OverdueRuleConfig = {
  frequency: 'daily' | 'weekly' | 'monthly'
  interval: number
}

export type AlertRule = {
  id: string
  organizationId: string
  scope: 'organization' | 'series'
  seriesId: string | null
  kind: AlertRuleKind
  config: UpcomingRuleConfig | OverdueRuleConfig
  channels: AlertRuleChannel[]
  recipients: AlertRuleRecipient
  active: boolean
  createdBy: string
  createdAt: string
  updatedAt: string
  seriesTitle?: string | null
}

export type UpsertSeriesRuleInput = {
  useOrgDefaults: boolean
  upcoming?: { daysBefore: number[] } | null
  overdue?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'never'
    interval?: number
  } | null
  channels?: AlertRuleChannel[]
  recipients?: AlertRuleRecipient
}

const rulesKey = (slug: string) => ['alert-rules', slug] as const
const alertSettingsKey = (slug: string) => ['alert-settings', slug] as const

const remindersKey = (slug: string) => ['reminders', slug] as const
const inboxKey = (slug: string) => ['alerts-inbox', slug] as const
const recentDeliveriesKey = (slug: string) => ['alerts-recent-deliveries', slug] as const
const previewKey = (slug: string) => ['alerts-preview', slug] as const

export function useAlertSettings(slug: string) {
  return useQuery({
    queryKey: alertSettingsKey(slug),
    queryFn: () => http<AlertSettings>(`/org/${slug}/settings/alerts`, { method: 'GET' }),
    enabled: !!slug,
  })
}

export function useUpdateAlertSettings(slug: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: AlertSettings) =>
      http<AlertSettings>(`/org/${slug}/settings/alerts`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: alertSettingsKey(slug) })
      queryClient.invalidateQueries({ queryKey: previewKey(slug) })
    },
  })
}

export function useReminders(slug: string) {
  return useQuery({
    queryKey: remindersKey(slug),
    queryFn: () => http<{ reminders: Reminder[] }>(`/org/${slug}/reminders`, { method: 'GET' }),
    enabled: !!slug,
  })
}

export function useAlertsInbox(slug: string) {
  return useQuery({
    queryKey: inboxKey(slug),
    queryFn: () => http<{ alerts: AlertDelivery[] }>(`/org/${slug}/alerts`, { method: 'GET' }),
    enabled: !!slug,
  })
}

export function useRecentDeliveries(slug: string) {
  return useQuery({
    queryKey: recentDeliveriesKey(slug),
    queryFn: () =>
      http<{ alerts: AlertDelivery[] }>(`/org/${slug}/alerts/recent?hours=24&limit=5`, {
        method: 'GET',
      }),
    enabled: !!slug,
  })
}

export { recentDeliveriesKey }

export function useAlertsPreview(slug: string) {
  return useQuery({
    queryKey: previewKey(slug),
    queryFn: () => http<AlertsPreview>(`/org/${slug}/alerts/preview`, { method: 'GET' }),
    enabled: !!slug,
  })
}

export function useCreateReminder(slug: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateReminderInput) =>
      http<{ reminder: Reminder }>(`/org/${slug}/reminders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: remindersKey(slug) })
      queryClient.invalidateQueries({ queryKey: previewKey(slug) })
    },
  })
}

export function useUpdateReminder(slug: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateReminderInput }) =>
      http<{ reminder: Reminder }>(`/org/${slug}/reminders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: remindersKey(slug) })
      queryClient.invalidateQueries({ queryKey: previewKey(slug) })
    },
  })
}

export function useCompleteReminder(slug: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      http<{ reminder: Reminder }>(`/org/${slug}/reminders/${id}/complete`, {
        method: 'POST',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: remindersKey(slug) })
      queryClient.invalidateQueries({ queryKey: inboxKey(slug) })
      queryClient.invalidateQueries({ queryKey: previewKey(slug) })
    },
  })
}

export function useDeleteReminder(slug: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => http<void>(`/org/${slug}/reminders/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: remindersKey(slug) })
      queryClient.invalidateQueries({ queryKey: previewKey(slug) })
    },
  })
}

export type SnoozeReminderInput =
  | { days: number; until?: never }
  | { until: string; days?: never }

export function useSnoozeReminder(slug: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: SnoozeReminderInput }) =>
      http<{ reminder: Reminder }>(`/org/${slug}/reminders/${id}/snooze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: remindersKey(slug) })
      queryClient.invalidateQueries({ queryKey: previewKey(slug) })
    },
  })
}

export function useAlertRules(slug: string, scope?: 'organization' | 'series') {
  const query = scope ? `?scope=${scope}` : ''
  return useQuery({
    queryKey: [...rulesKey(slug), scope],
    queryFn: () =>
      http<{ rules: AlertRule[] }>(`/org/${slug}/alert-rules${query}`, { method: 'GET' }),
    enabled: !!slug,
  })
}

export function useUpdateAlertRule(slug: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string
      data: {
        config?: UpcomingRuleConfig | OverdueRuleConfig
        channels?: AlertRuleChannel[]
        recipients?: AlertRuleRecipient
        active?: boolean
      }
    }) =>
      http<{ rule: AlertRule }>(`/org/${slug}/alert-rules/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rulesKey(slug) })
    },
  })
}

export function useUpsertSeriesAlertRule(slug: string, seriesId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: UpsertSeriesRuleInput) =>
      http<{ rules: AlertRule[]; useOrgDefaults: boolean }>(
        `/org/${slug}/transactions/${seriesId}/alert-rule`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rulesKey(slug) })
    },
  })
}

