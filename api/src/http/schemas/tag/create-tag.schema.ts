import { StatusCodes } from 'http-status-codes'
import z from 'zod'

export const createTagSchema = {
  tags: ['Tag'],
  description: 'Create tag',
  operationId: 'createTag',
  params: z.object({ slug: z.string().nonempty() }),
  body: z.object({
    name: z.string().min(1).max(50).transform(val => val.toLowerCase().trim()),
    color: z.string().nonempty(),
  }),
  response: {
    [StatusCodes.CREATED]: z.object({
      tag: z.object({ id: z.string(), name: z.string(), color: z.string() }),
    }),
  },
}

export type CreateTagSchemaParams = z.infer<typeof createTagSchema.params>
export type CreateTagSchemaBody = z.infer<typeof createTagSchema.body>
