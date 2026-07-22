import z from 'zod'

const settingsResponse = z.object({
  notificationsEnabled: z.boolean(),
  updatedAt: z.date(),
})

export const getSystemNotificationSettingsSchema = {
  tags: ['System'],
  description: 'Get platform-wide notification kill switch',
  operationId: 'getSystemNotificationSettings',
  params: z.object({ slug: z.string().nonempty() }),
  response: {
    200: settingsResponse,
  },
}

export const updateSystemNotificationSettingsSchema = {
  tags: ['System'],
  description: 'Enable or disable all system notifications (all orgs)',
  operationId: 'updateSystemNotificationSettings',
  params: z.object({ slug: z.string().nonempty() }),
  body: z.object({
    notificationsEnabled: z.boolean(),
  }),
  response: {
    200: settingsResponse,
  },
}

export type UpdateSystemNotificationSettingsBody = z.infer<
  typeof updateSystemNotificationSettingsSchema.body
>
