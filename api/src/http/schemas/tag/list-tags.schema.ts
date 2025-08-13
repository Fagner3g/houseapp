import z from 'zod'

export const listTagsSchema = {
  tags: ['Tag'],
  description: 'List tags for organization',
  operationId: 'listTags',
  params: z.object({ slug: z.string() }),
  response: {
    200: z.object({
      tags: z.array(z.object({ id: z.string(), name: z.string(), color: z.string() })),
    }),
  },
}

export type ListTagsSchemaParams = z.infer<typeof listTagsSchema.params>
