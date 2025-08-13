import z from 'zod'

import { transactionResponseSchema } from './shared/transaction-response'

export const listTransactionSchema = {
  tags: ['Transaction'],
  description: 'List transactions for authenticated user',
  operationId: 'listTransactions',
  params: z.object({ slug: z.string().nonempty() }),
  querystring: z.object({
    type: z.enum(['all', 'income', 'expense']).default('all'),
    dateFrom: z.coerce.date().optional(),
    dateTo: z.coerce.date().optional(),
    page: z.coerce.number().int().min(1).default(1),
    perPage: z.coerce.number().int().min(1).default(10),
  }),
  response: {
    200: z.object({
      transactions: z.array(transactionResponseSchema),
      page: z.number(),
      perPage: z.number(),
      totalItems: z.number(),
      totalPages: z.number(),
      pagesRemaining: z.number(),
    }),
  },
}

export type ListTransactionSchemaParams = z.infer<typeof listTransactionSchema.params>
export type ListTransactionSchemaQuery = z.infer<typeof listTransactionSchema.querystring>
