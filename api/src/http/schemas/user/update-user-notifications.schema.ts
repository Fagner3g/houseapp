import z from 'zod'

const alertPreferencesSchema = z.object({
  whatsapp: z.boolean(),
  inApp: z.boolean(),
  extension: z.boolean(),
})

const alertPreferencesPatchSchema = z.object({
  whatsapp: z.boolean().optional(),
  inApp: z.boolean().optional(),
  extension: z.boolean().optional(),
})

export const updateUserNotificationsSchema = {
  tags: ['user'],
  summary: 'Update user notification preferences',
  params: z.object({ slug: z.string() }),
  body: z
    .object({
      userId: z.string(),
      notificationsEnabled: z.boolean().optional(),
      alertPreferences: alertPreferencesPatchSchema.optional(),
    })
    .refine(data => data.notificationsEnabled !== undefined || data.alertPreferences !== undefined, {
      message: 'At least one of notificationsEnabled or alertPreferences is required',
    }),
  response: {
    200: z.object({
      userId: z.string(),
      notificationsEnabled: z.boolean(),
      alertPreferences: alertPreferencesSchema,
    }),
    404: z.object({
      message: z.string(),
    }),
  },
}

export type UpdateUserNotificationsInputParams = z.infer<typeof updateUserNotificationsSchema.body>
