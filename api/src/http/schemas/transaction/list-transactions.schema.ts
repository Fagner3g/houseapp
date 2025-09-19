import dayjs from 'dayjs'
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
    type: z.enum(['all', 'income', 'expense']).default('all'),
    dateFrom: z.coerce.date().default(dayjs().startOf('month').toDate()),
    dateTo: z.coerce.date().default(dayjs().endOf('month').toDate()),
    page: z.coerce.number().int().default(1),
    perPage: z.coerce.number().int().default(10),
    responsibleUserId: z.string().optional(),
    onlyMarked: z.coerce.boolean().optional(),
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
