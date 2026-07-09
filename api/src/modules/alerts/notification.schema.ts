import z from 'zod'

export const notificationResponseSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  userId: z.string(),
  alertRuleId: z.string().nullable(),
  transactionId: z.string().nullable(),
  accountId: z.string().nullable(),
  title: z.string(),
  body: z.string().nullable(),
  channel: z.string(),
  status: z.string(),
  sentAt: z.string().nullable(),
  readAt: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()),
  createdAt: z.string(),
})

const notificationParams = z.object({ id: z.string() })

export const listNotificationsSchema = {
  tags: ['Notifications'],
  description: 'List user notifications',
  operationId: 'listNotifications',
  response: {
    200: z.object({ notifications: z.array(notificationResponseSchema) }),
  },
}

export const listPendingNotificationsSchema = {
  tags: ['Notifications'],
  description: 'List pending user notifications',
  operationId: 'listPendingNotifications',
  response: {
    200: z.object({ notifications: z.array(notificationResponseSchema) }),
  },
}

export const markNotificationReadSchema = {
  tags: ['Notifications'],
  description: 'Mark notification as read',
  operationId: 'markNotificationRead',
  params: notificationParams,
  response: {
    200: z.object({ notification: notificationResponseSchema }),
  },
}
