import z from 'zod'

export enum RegisterType {
  EXPENSE = 'expense',
  INCOME = 'income',
}

const base = z.object({
  type: z.enum(['expense', 'income']).default('expense').nonoptional('O tipo é obrigatório'),
  title: z.string('O título é obrigatório').nonempty(),
  amount: z.string('Valor da transação é obrigatório'),
  dueDate: z.date({ error: 'A data de vencimento é obrigatória' }),
  payToEmail: z.string().email('Informe um e-mail válido'),
  tags: z.array(z.object({ name: z.string(), color: z.string() })).optional(),
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
  recurrenceInfinite: z.boolean().optional(),
  recurrenceInterval: z.number().int().optional(),
  installmentsTotal: z.number().int().optional(),
  recurrenceStart: z.date().optional(),
})

const nonRecurring = base.extend({
  isRecurring: z.literal(false),
  recurrenceSelector: z.undefined(),
  recurrenceType: z.undefined(),
  recurrenceUntil: z.undefined(),
  recurrenceInfinite: z.undefined(),
  recurrenceInterval: z.undefined(),
  // Do not validate installments when not recurring
  installmentsTotal: z.any().optional(),
  recurrenceStart: z.undefined(),
})

const _schema = z.discriminatedUnion('isRecurring', [recurring, nonRecurring])

export const newTransactionSchema = _schema.superRefine((v, ctx) => {
  if (!v.isRecurring) return
  if (
    v.recurrenceInterval == null ||
    Number.isNaN(v.recurrenceInterval) ||
    v.recurrenceInterval < 1
  ) {
    ctx.addIssue({
      code: 'custom',
      path: ['recurrenceInterval'],
      message: 'Informe o intervalo de repetição',
    })
  }

  // Quando o modo é "Repete", exigir total de parcelas válido
  if (
    v.recurrenceSelector === 'repeat' &&
    (v.installmentsTotal == null || Number.isNaN(v.installmentsTotal) || v.installmentsTotal < 1)
  ) {
    ctx.addIssue({
      code: 'custom',
      path: ['installmentsTotal'],
      message: 'Informe o total de parcelas',
    })
  }

  // Quando o modo é "Termina em", exigir data final se não for infinito
  if (v.recurrenceSelector === 'date' && !v.recurrenceInfinite && !v.recurrenceUntil) {
    ctx.addIssue({
      code: 'custom',
      path: ['recurrenceUntil'],
      message: 'A data final é obrigatória para o modo "Termina em"',
    })
  }

  if (v.recurrenceUntil) {
    const now = new Date()
    const min = v.dueDate > now ? v.dueDate : now
    if (v.recurrenceUntil <= min) {
      ctx.addIssue({
        code: 'custom',
        path: ['recurrenceUntil'],
        message: 'A data final deve ser posterior ao vencimento e à data atual',
      })
    }
  }
})

export type NewTransactionSchema = z.infer<typeof newTransactionSchema>
