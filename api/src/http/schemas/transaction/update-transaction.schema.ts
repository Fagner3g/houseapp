import z from 'zod'

const base = z.object({
  type: z.enum(['expense', 'income']).default('expense').nonoptional('O tipo é obrigatório'),
  title: z.string('O título é obrigatório').min(1).max(50),
  amount: z.coerce.number('Valor da transação é obrigatório').min(1),
  dueDate: z.coerce.date({ error: 'A data de vencimento é obrigatória' }),
  payToEmail: z.email('Defina o pra quem vai o registro'),
  description: z.string().optional(),
  tags: z
    .array(z.object({ name: z.string().trim().min(1), color: z.string().trim().min(1) }))
    .optional(),
  applyToSeries: z.boolean().default(true),
})

const recurring = base.extend({
  isRecurring: z.literal(true),
  recurrenceSelector: z.enum(['date', 'repeat']).optional(),
  recurrenceType: z.enum(['weekly', 'monthly', 'yearly', 'custom']).optional(),
  recurrenceUntil: z.coerce.date().optional(),
  recurrenceInterval: z.coerce.number().int().optional(),
  recurrenceStart: z.coerce.date().optional(),
  installmentsTotal: z.coerce.number().int().optional(),
  installmentsPaid: z.coerce.number().int().optional(),
})

const nonRecurring = base.extend({
  isRecurring: z.literal(false),
  recurrenceSelector: z.undefined(),
  recurrenceType: z.undefined(),
  recurrenceUntil: z.undefined(),
  recurrenceInterval: z.undefined(),
  recurrenceStart: z.undefined(),
  installmentsTotal: z.undefined(),
  installmentsPaid: z.undefined(),
})

const bodySchema = z.discriminatedUnion('isRecurring', [recurring, nonRecurring])

export const updateTransactionSchema = {
  tags: ['Transaction'],
  description: 'Update a transaction',
  operationId: 'updateTransaction',
  params: z.object({ slug: z.string(), id: z.string() }),
  body: bodySchema,
  response: {
    204: z.null(),
  },
}

export type UpdateTransactionSchemaParams = z.infer<typeof updateTransactionSchema.params>
export type UpdateTransactionSchemaBody = z.infer<typeof bodySchema>
export type UpdateTransactionSchemaResponse = z.infer<typeof updateTransactionSchema.response>
