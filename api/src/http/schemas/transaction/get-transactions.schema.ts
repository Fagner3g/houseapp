import z from 'zod'

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
      transaction: z
        .object({
          id: z.string(),
          title: z.string(),
          ownerId: z.string(),
          payToId: z.string(),
          amount: z.number(),
          dueDate: z.date(),
          description: z.string().nullable(),
          createdAt: z.date(),
        })
        .nullable(),
    }),
  },
}

export type GetTransactionSchemaParams = z.infer<typeof getTransactionSchema.params>
