import z from 'zod'

import { transactionResponseSchema } from './shared/transaction-response'

export const getTransactionSchema = {
  tags: ['Transaction'],
  description: 'Get transaction by id',
  operationId: 'getTransactionById',
  params: z.object({
    id: z.string(),
    slug: z.string(),
  }),
  response: {
    200: z.object({
      transaction: transactionResponseSchema,
    }),
  },
}

export type GetTransactionSchemaParams = z.infer<typeof getTransactionSchema.params>
