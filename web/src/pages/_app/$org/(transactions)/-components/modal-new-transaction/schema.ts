import z from 'zod'

export enum RegisterType {
  EXPENSE = 'expense',
  INCOME = 'income',
}

const base = z.object({
  type: z.enum(['expense', 'income']).default('expense').nonoptional('O tipo é obrigatório'),
  title: z.string('O título é obrigatório').nonempty(),
  amount: z.number('Valor da transação é obrigatório').min(1),
  dueDate: z.date({ error: 'A data de vencimento é obrigatória' }),
  payToEmail: z.string('Defina o pra quem vai o registro').nonempty(),
  tags: z.array(z.string()).optional(),
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
  recurrenceUntil: z.date().optional(),
  recurrenceInterval: z.number().int().optional(),
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

export type NewTransactionSchema = z.infer<typeof newTransactionSchema>
