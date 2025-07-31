import { z } from 'zod'

export const createOrganizationSchema = {
  tags: ['Organization'],
  description: 'Create a new organization',
  operationId: 'createOrganization',
  body: z.object({ name: z.string() }),
  response: {
    201: z.object({
      organizationSlug: z.string(),
    }),
  },
}
