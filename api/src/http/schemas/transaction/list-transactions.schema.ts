import z from 'zod'

export const listTransactionSchema = {
  tags: ['Transaction'],
  description: 'List transactions for authenticated user',
  operationId: 'listTransactions',
  params: z.object({ slug: z.string().nonempty() }),
  response: {
    200: z.object({
      transactions: z.array(
        z.object({
          id: z.string(),
          title: z.string(),
          ownerId: z.string(),
          payToId: z.string(),
          amount: z.number(),
          dueDate: z.date(),
          description: z.string().nullable(),
          createdAt: z.date(),
        })
      ),
    }),
  },
}

export type ListTransactionSchemaParams = z.infer<typeof listTransactionSchema.params>
