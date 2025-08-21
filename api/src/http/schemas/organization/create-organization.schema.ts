import z from 'zod'

export const createOrganizationSchema = {
  tags: ['Organization'],
  description: 'Create a new organization',
  operationId: 'createOrganization',
  body: z.object({
    name: z.string(),
    description: z.string().optional(),
  }),
  response: {
    201: z.object({
      slug: z.string(),
      name: z.string(),
      description: z.string().nullish(),
    }),
  },
}

export type CreateOrganizationBody = z.infer<typeof createOrganizationSchema.body>
