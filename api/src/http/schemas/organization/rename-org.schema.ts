import z from 'zod'

export const renameOrgSchema = {
  tags: ['Organization'],
  description: 'Rename an organization',
  operationId: 'renameOrg',
  params: z.object({ slug: z.string().nonempty() }),
  body: z.object({
    name: z.string().nonempty(),
    description: z.string().optional(),
  }),
  response: {
    200: z.object({
      organization: z.object({
        id: z.string(),
        name: z.string(),
        slug: z.string(),
        description: z.string().nullish(),
        createdAt: z.date(),
        updatedAt: z.date(),
      }),
    }),
  },
}

export type RenameOrgBody = z.infer<typeof renameOrgSchema.body>
