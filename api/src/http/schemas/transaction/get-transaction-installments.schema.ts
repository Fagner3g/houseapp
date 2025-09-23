import z from 'zod'

export const getTransactionInstallmentsSchema = {
  tags: ['Transaction'],
  description: 'Get transaction installments by series id',
  operationId: 'getTransactionInstallments',
  params: z.object({
    seriesId: z.string(),
    slug: z.string(),
  }),
  response: {
    200: z.object({
      installments: z.array(
        z.object({
          id: z.string(),
          installmentIndex: z.number(),
          dueDate: z.date(),
          amount: z.string(),
          status: z.enum(['pending', 'paid', 'canceled']),
          paidAt: z.date().nullable(),
          valuePaid: z.number().nullable(),
          description: z.string().nullable(),
        })
      ),
    }),
  },
}

export type GetTransactionInstallmentsSchemaParams = z.infer<
  typeof getTransactionInstallmentsSchema.params
>
