import z from 'zod'

import { transactionResponseSchema } from './shared/transaction-response'

export const listTransactionSchema = {
  tags: ['Transaction'],
  description: 'List transactions for authenticated user',
  operationId: 'listTransactions',
  params: z.object({ slug: z.string().nonempty() }),
  response: {
    200: z.object({
      transactions: z.array(transactionResponseSchema),
    }),
  },
}

export type ListTransactionSchemaParams = z.infer<typeof listTransactionSchema.params>
