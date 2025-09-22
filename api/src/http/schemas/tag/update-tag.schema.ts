import { StatusCodes } from 'http-status-codes'
import z from 'zod'

export const updateTagSchema = {
  tags: ['Tag'],
  description: 'Update tag',
  operationId: 'updateTag',
  params: z.object({ slug: z.string().nonempty(), id: z.string().nonempty() }),
  body: z.object({
    name: z
      .string()
      .min(1)
      .max(50)
      .transform(val => val.toLowerCase().trim()),
    color: z.string().nonempty(),
  }),
  response: {
    [StatusCodes.OK]: z.object({
      tag: z.object({ id: z.string(), name: z.string(), color: z.string() }),
    }),
  },
}

export type UpdateTagSchemaParams = z.infer<typeof updateTagSchema.params>
export type UpdateTagSchemaBody = z.infer<typeof updateTagSchema.body>
