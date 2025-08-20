import z from 'zod'

export const transactionResponseSchema = z.object({
  id: z.string(),
  type: z.enum(['expense', 'income']),
  title: z.string(),
  ownerId: z.string(),
  payTo: z.string(),
  amount: z.number(),
  dueDate: z.date(),
  paidAt: z.date().nullable(),
  description: z.string().nullable(),
  createdAt: z.date(),
  status: z.enum(['paid', 'overdue', 'scheduled']),
  overdueDays: z.number(),
  isRecurring: z.boolean(),
  recurrenceSelector: z.enum(['date', 'repeat']).optional(),
  recurrenceType: z.enum(['weekly', 'monthly', 'yearly', 'custom']).optional(),
  recurrenceUntil: z.coerce.date().optional(),
  recurrenceInterval: z.coerce.number().int().optional(),
  recurrenceStart: z.coerce.date().optional(),
  installmentsTotal: z.coerce.number().int().nullable().optional(),
  installmentsPaid: z.coerce.number().int().optional(),
  tags: z.array(z.object({ name: z.string(), color: z.string() })),
})

export type TransactionResponse = z.infer<typeof transactionResponseSchema>
