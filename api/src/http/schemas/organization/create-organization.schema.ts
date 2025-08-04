import z from 'zod'

export const createOrganizationSchema = {
  tags: ['Organization'],
  description: 'Create a new organization',
  operationId: 'createOrganization',
  body: z.object({ name: z.string() }),
  response: {
    201: z.object({
      slug: z.string(),
      name: z.string(),
    }),
  },
}

export type CreateOrganizationBody = z.infer<typeof createOrganizationSchema.body>
