import z from 'zod'

export const renameOrgSchema = {
  tags: ['Organization'],
  description: 'Rename an organization',
  operationId: 'renameOrg',
  params: z.object({ slug: z.string().nonempty() }),
  body: z.object({ name: z.string().nonempty() }),
  response: {
    200: z.object({
      organization: z.object({
        id: z.string(),
        name: z.string(),
        slug: z.string(),
        createdAt: z.date(),
        updatedAt: z.date(),
      }),
    }),
  },
}

export type RenameOrgBody = z.infer<typeof renameOrgSchema.body>
