import z from 'zod'

export const listUsersByOrgSchema = {
  tags: ['Organization'],
  description: 'List all users in an organization',
  operationId: 'listUsersByOrg',
  params: z.object({ slug: z.string() }),
  response: {
    200: z.object({
      users: z.array(
        z.object({
          name: z.string(),
          email: z.string(),
          phone: z.string(),
          avatarUrl: z.string(),
          isOwner: z.boolean(),
        })
      ),
    }),
  },
}
