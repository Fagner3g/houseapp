import z from 'zod'

export const updateUserSchema = {
  tags: ['user'],
  summary: 'Update user basic info',
  params: z.object({ slug: z.string() }),
  body: z.object({
    userId: z.string(),
    email: z.email(),
    name: z.string().min(1).max(50).optional(),
    phone: z.string().min(10).max(11).optional(),
  }),
  response: {
    200: z.object({
      name: z.string(),
      email: z.string(),
      phone: z.string().nullable(),
      avatarUrl: z.string(),
      isOwner: z.string().nullable(),
    }),
  },
}

export type UpdateUserInputParams = z.infer<typeof updateUserSchema.body>
