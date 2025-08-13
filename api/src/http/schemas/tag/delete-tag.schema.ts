import { StatusCodes } from 'http-status-codes'
import z from 'zod'

export const deleteTagSchema = {
  tags: ['Tag'],
  description: 'Delete tag',
  operationId: 'deleteTag',
  params: z.object({ slug: z.string().nonempty(), id: z.string().nonempty() }),
  response: {
    [StatusCodes.OK]: z.null(),
  },
}

export type DeleteTagSchemaParams = z.infer<typeof deleteTagSchema.params>
