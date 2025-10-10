import z from 'zod'

export const updateUserNotificationsSchema = {
  tags: ['user'],
  summary: 'Update user notification preferences',
  params: z.object({ slug: z.string() }),
  body: z.object({
    userId: z.string(),
    notificationsEnabled: z.boolean(),
  }),
  response: {
    200: z.object({
      userId: z.string(),
      notificationsEnabled: z.boolean(),
    }),
    404: z.object({
      message: z.string(),
    }),
  },
}

export type UpdateUserNotificationsInputParams = z.infer<typeof updateUserNotificationsSchema.body>
