import { StatusCodes } from 'http-status-codes'
import z from 'zod'

export const deleteTransactionsSchema = {
  tags: ['Transaction'],
  description: 'Delete multiple transactions',
  operationId: 'deleteTransactions',
  params: z.object({ slug: z.string().nonempty() }),
  body: z.object({ ids: z.array(z.string()) }),
  response: { [StatusCodes.OK]: z.null() },
}

export type DeleteTransactionsSchemaParams = z.infer<typeof deleteTransactionsSchema.params>
export type DeleteTransactionsSchemaBody = z.infer<typeof deleteTransactionsSchema.body>
