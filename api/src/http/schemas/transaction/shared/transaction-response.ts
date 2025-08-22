import z from 'zod'

export const transactionResponseSchema = z.object({
  id: z.string(),
  serieId: z.string(),
  type: z.enum(['expense', 'income']),
  title: z.string(),
  payTo: z.string(),
  amount: z.string(),
  dueDate: z.date(),
  paidAt: z.date().nullable(),
  status: z.enum(['pending', 'paid', 'canceled']),
  overdueDays: z.number(),
  tags: z.array(z.object({ name: z.string(), color: z.string() })),
  installmentsTotal: z.number().int().nullable(),
  installmentsPaid: z.number().int().nullable(),
})

export type TransactionResponse = z.infer<typeof transactionResponseSchema>
