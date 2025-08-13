import z from 'zod'

import { transactionResponseSchema } from './shared/transaction-response'

export const listTransactionSchema = {
  tags: ['Transaction'],
  description: 'List transactions for authenticated user',
  operationId: 'listTransactions',
  params: z.object({ slug: z.string().nonempty() }),
  querystring: z.object({
    tags: z.array(z.string()).optional(),
    tagFilterMode: z.enum(['any', 'all']).default('any'),
  }),
  response: {
    200: z.object({
      transactions: z.array(transactionResponseSchema),
    }),
  },
}

export type ListTransactionSchemaParams = z.infer<typeof listTransactionSchema.params>
export type ListTransactionSchemaQuery = z.infer<typeof listTransactionSchema.querystring>
