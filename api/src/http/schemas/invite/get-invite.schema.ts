import z from 'zod'

export const getInviteSchema = {
  tags: ['Invite'],
  description: 'Get invite by token',
  operationId: 'getInvite',
  params: z.object({ token: z.string() }),
  response: {
    200: z.object({
      invite: z
        .object({
          id: z.string(),
          email: z.string(),
          organizationId: z.string(),
          organizationSlug: z.string(),
          token: z.string(),
          acceptedAt: z.date().nullish(),
          createdAt: z.date(),
        })
        .nullable(),
    }),
  },
}

export type GetInviteParams = z.infer<typeof getInviteSchema.params>
