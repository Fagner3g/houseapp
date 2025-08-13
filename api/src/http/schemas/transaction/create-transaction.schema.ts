import z from 'zod'

const base = z.object({
  type: z.enum(['expense', 'income']).default('expense').nonoptional('O tipo é obrigatório'),
  title: z.string('O título é obrigatório').min(1).max(50),
  amount: z.coerce.number('Valor da transação é obrigatório').min(1),
  dueDate: z.coerce
    .date({ error: 'A data de vencimento é obrigatória' })
    .refine(date => date >= new Date(), {
      message: 'A data de vencimento deve ser no futuro',
    }),
  payToEmail: z.email('Defina o pra quem vai o registro'),
  description: z.string().optional(),
})

const recurring = base.extend({
  isRecurring: z.literal(true),
  recurrenceSelector: z.enum(['date', 'repeat'], {
    error: 'Selecione um tipo de recorrência',
  }),
  recurrenceType: z.enum(['weekly', 'monthly', 'yearly'], {
    error: 'Selecione uma recorrência',
  }),
  recurrenceUntil: z.coerce.date().optional(),
  recurrenceInterval: z.coerce.number().int().optional(),
})

const nonRecurring = base.extend({
  isRecurring: z.literal(false),
  recurrenceSelector: z.undefined(),
  recurrenceType: z.undefined(),
  recurrenceUntil: z.undefined(),
  recurrenceInterval: z.undefined(),
})

const _schema = z.discriminatedUnion('isRecurring', [recurring, nonRecurring])

export const newTransactionSchema = _schema.superRefine((v, ctx) => {
  if (!v.isRecurring) return
  if (v.recurrenceSelector === 'repeat') {
    if (v.recurrenceInterval == null || Number.isNaN(v.recurrenceInterval)) {
      ctx.addIssue({
        code: 'custom',
        path: ['recurrenceInterval'],
        message: 'Informe o intervalo de repetição',
      })
    }
  }

  if (v.recurrenceSelector === 'date') {
    const now = new Date()
    const min = v.dueDate > now ? v.dueDate : now

    if (!v.recurrenceUntil) {
      ctx.addIssue({
        code: 'custom',
        path: ['recurrenceUntil'],
        message: 'Informe a data final',
      })
    } else if (v.recurrenceUntil <= min) {
      ctx.addIssue({
        code: 'custom',
        path: ['recurrenceUntil'],
        message: 'A data final deve ser posterior ao vencimento e à data atual',
      })
    }
  }
})

export const createTransactionsSchema = {
  tags: ['Transaction'],
  description: 'Create an transaction',
  operationId: 'createTransaction',
  params: z.object({ slug: z.string() }),
  body: newTransactionSchema,
  response: {
    201: z.null(),
  },
}

export type CreateTransactionsSchemaParams = z.infer<typeof createTransactionsSchema.params>
export type CreateTransactionsSchemaBody = z.infer<typeof createTransactionsSchema.body>
export type CreateTransactionsSchemaResponse = z.infer<typeof createTransactionsSchema.response>
