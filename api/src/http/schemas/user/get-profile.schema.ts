import z from 'zod'

export const getProfileSchema = {
  tags: ['User'],
  description: 'Get profile',
  operationId: 'getProfile',
  response: {
    200: z.object({
      user: z.object({
        name: z.string(),
        email: z.string(),
        phone: z.string(),
        ddd: z.string(),
        avatarUrl: z.string(),
      }),
    }),
  },
}
