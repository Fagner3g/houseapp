import z from 'zod'

const alertPreferencesSchema = z.object({
  whatsapp: z.boolean(),
  inApp: z.boolean(),
  extension: z.boolean(),
})

export const listUsersByOrgSchema = {
  tags: ['Organization'],
  description: 'List all users in an organization',
  operationId: 'listUsersByOrg',
  params: z.object({ slug: z.string() }),
  response: {
    200: z.object({
      users: z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          email: z.string(),
          phone: z.string().nullable(),
          avatarUrl: z.string().nullable(),
          role: z.string(),
          notificationsEnabled: z.boolean(),
          alertPreferences: alertPreferencesSchema,
          isOwner: z.boolean(),
        })
      ),
    }),
  },
}
