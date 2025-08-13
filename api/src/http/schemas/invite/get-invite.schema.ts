import z from 'zod'

export const getInviteSchema = {
  tags: ['Invite'],
  description: 'Get invite by user',
  operationId: 'getInvite',
  params: z.object({ slug: z.string() }),
  response: {
    200: z.object({
      invites: z.array(
        z.object({
          id: z.string(),
          organization: z.string(),
          email: z.string(),
          slug: z.string(),
          owner: z.string(),
        })
      ),
    }),
  },
}
