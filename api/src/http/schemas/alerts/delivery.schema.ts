import { StatusCodes } from 'http-status-codes'
import z from 'zod'

const alertDeliveryDtoSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  userId: z.string(),
  recipientName: z.string().nullable().optional(),
  sourceType: z.enum(['rule', 'reminder', 'investment']),
  ruleId: z.string().nullable(),
  reminderId: z.string().nullable(),
  occurrenceId: z.string().nullable(),
  kind: z.string(),
  channel: z.enum(['in_app', 'whatsapp', 'extension']),
  channels: z.array(z.enum(['in_app', 'whatsapp', 'extension'])).optional(),
  status: z.enum(['pending', 'sent', 'failed', 'skipped']),
  payload: z.record(z.string(), z.unknown()),
  sentAt: z.string().nullable(),
  readAt: z.string().nullable(),
  ackedAt: z.string().nullable(),
  createdAt: z.string(),
  orgSlug: z.string().optional(),
  orgName: z.string().optional(),
})

export const listRecentDeliveriesSchema = {
  tags: ['Alerts'],
  description: 'List recent sent alert deliveries for organization',
  operationId: 'listRecentDeliveries',
  params: z.object({ slug: z.string().nonempty() }),
  querystring: z
    .object({
      hours: z.coerce.number().int().min(1).max(168).optional(),
      limit: z.coerce.number().int().min(1).max(100).optional(),
    })
    .optional(),
  response: {
    [StatusCodes.OK]: z.object({
      alerts: z.array(alertDeliveryDtoSchema),
    }),
  },
}

export const listInboxSchema = {
  tags: ['Alerts'],
  description: 'List in-app alert deliveries for current user',
  operationId: 'listInboxAlerts',
  params: z.object({ slug: z.string().nonempty() }),
  querystring: z
    .object({
      unread: z
        .enum(['true', 'false'])
        .optional()
        .transform(v => v === 'true'),
    })
    .optional(),
  response: {
    [StatusCodes.OK]: z.object({
      alerts: z.array(alertDeliveryDtoSchema),
    }),
  },
}

export const markAlertReadSchema = {
  tags: ['Alerts'],
  description: 'Mark in-app alert as read',
  operationId: 'markAlertRead',
  params: z.object({
    slug: z.string().nonempty(),
    id: z.string().nonempty(),
  }),
  response: {
    [StatusCodes.OK]: z.object({
      alert: z.object({
        id: z.string(),
        readAt: z.string().nullable(),
      }),
    }),
  },
}

const reminderPreviewItemSchema = z.object({
  reminderId: z.string(),
  title: z.string(),
  dueDate: z.string(),
  kind: z.enum(['upcoming', 'overdue']),
  daysUntilDue: z.number(),
  overdueDays: z.number().optional(),
  amountCents: z.number().nullable(),
  notifyHour: z.number(),
  notifyMinute: z.number(),
  channels: z.array(z.enum(['in_app', 'whatsapp', 'extension'])),
  recipientUserId: z.string(),
  recipientName: z.string().nullable(),
})

const reminderPreviewSkipItemSchema = z.object({
  reminderId: z.string(),
  title: z.string(),
  reason: z.enum(['snoozed', 'outside_schedule', 'already_sent', 'no_rule', 'period_completed']),
  daysUntilDue: z.number(),
  notifyHour: z.number(),
  notifyMinute: z.number(),
  snoozedUntil: z.string().optional(),
})

const rulePreviewItemSchema = z.object({
  ruleId: z.string(),
  kind: z.enum(['upcoming', 'overdue']),
  occurrenceId: z.string(),
  seriesId: z.string(),
  title: z.string(),
  dueDate: z.string(),
  daysUntilDue: z.number().optional(),
  overdueDays: z.number().optional(),
  amountCents: z.number(),
  channels: z.array(z.enum(['in_app', 'whatsapp', 'extension'])),
  recipientUserId: z.string(),
  recipientName: z.string().nullable(),
})

const investmentPreviewItemSchema = z.object({
  assetId: z.string(),
  planId: z.string(),
  referenceMonth: z.string(),
  assetSymbol: z.string(),
  assetName: z.string(),
  dueDate: z.string(),
  plannedAmount: z.number().nullable(),
  plannedQuantity: z.number().nullable(),
  status: z.enum(['pending', 'overdue']),
  recipientUserId: z.string(),
  recipientName: z.string().nullable(),
})

export const previewAlertsSchema = {
  tags: ['Alerts'],
  description: 'Preview upcoming alerts without sending',
  operationId: 'previewAlerts',
  params: z.object({ slug: z.string().nonempty() }),
  response: {
    [StatusCodes.OK]: z.object({
      defaultNotifyHour: z.number(),
      defaultNotifyMinute: z.number(),
      reminders: z.array(reminderPreviewItemSchema),
      skippedReminders: z.array(reminderPreviewSkipItemSchema),
      rules: z.array(rulePreviewItemSchema),
      investments: z.array(investmentPreviewItemSchema),
    }),
  },
}

export const listPendingExtensionAlertsSchema = {
  tags: ['Alerts'],
  description: 'List pending extension alerts for current user across all orgs',
  operationId: 'listPendingExtensionAlerts',
  response: {
    [StatusCodes.OK]: z.object({
      alerts: z.array(alertDeliveryDtoSchema),
    }),
  },
}

export const ackAlertSchema = {
  tags: ['Alerts'],
  description: 'Acknowledge extension alert delivery',
  operationId: 'ackAlert',
  params: z.object({
    slug: z.string().nonempty(),
    id: z.string().nonempty(),
  }),
  response: {
    [StatusCodes.OK]: z.object({
      alert: z.object({
        id: z.string(),
        ackedAt: z.string().nullable(),
        status: z.enum(['pending', 'sent', 'failed', 'skipped']),
      }),
    }),
  },
}

export type ListInboxSchemaParams = z.infer<typeof listInboxSchema.params>
export type MarkAlertReadSchemaParams = z.infer<typeof markAlertReadSchema.params>
export type PreviewAlertsSchemaParams = z.infer<typeof previewAlertsSchema.params>
export type AckAlertSchemaParams = z.infer<typeof ackAlertSchema.params>
