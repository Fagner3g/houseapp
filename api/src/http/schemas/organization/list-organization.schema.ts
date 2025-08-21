import z from 'zod'

export const listOrganizationsSchema = {
  tags: ['Organization'],
  description: 'List organizations for authenticated user',
  operationId: 'listOrganizations',
  response: {
    200: z.object({
      organizations: z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          slug: z.string(),
          createdAt: z.date(),
        })
      ),
    }),
  },
}
