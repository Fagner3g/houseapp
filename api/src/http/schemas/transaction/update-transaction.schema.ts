import z from 'zod'

import { newTransactionSchema } from './create-transaction.schema'

export const updateTransactionSchema = {
  tags: ['Transaction'],
  description: 'Update a transaction',
  operationId: 'updateTransaction',
  params: z.object({ slug: z.string(), id: z.string() }),
  body: newTransactionSchema.and(
    z.object({
      applyToSeries: z.boolean().default(true),
    }),
  ),
  response: {
    204: z.null(),
  },
}

export type UpdateTransactionSchemaParams = z.infer<typeof updateTransactionSchema.params>
export type UpdateTransactionSchemaBody = z.infer<typeof updateTransactionSchema.body>
export type UpdateTransactionSchemaResponse = z.infer<typeof updateTransactionSchema.response>
