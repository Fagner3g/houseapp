import z from 'zod'

import { toCentsStrict } from '@/http/utils/format'

const base = z.object({
  type: z.enum(['expense', 'income']).default('expense').nonoptional('O tipo é obrigatório'),
  title: z.string('O título é obrigatório').min(1).max(50),
  amount: z
    .string('Valor da transação é obrigatório')
    .regex(
      /^-?\d+(\.\d{1,2})?$/,
      'Use ponto como separador decimal e no máximo 2 casas (ex.: 1234.56)'
    )
    .transform(val => toCentsStrict(val))
    .refine(v => v >= 1n, 'Valor mínimo é 0,01'),
  dueDate: z.coerce.date({ error: 'A data de vencimento é obrigatória' }),
  payToEmail: z.email('Defina o pra quem vai o registro'),
  description: z.string().optional(),
  tags: z
    .array(z.object({ name: z.string().trim().min(1).transform(val => val.toLowerCase().trim()), color: z.string().trim().min(1) }))
    .optional(),
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

  const interval = v.recurrenceInterval ?? 1
  if (interval < 1) {
    ctx.addIssue({
      code: 'custom',
      path: ['recurrenceInterval'],
      message: 'O intervalo deve ser no mínimo 1',
    })
  }

  if (!v.recurrenceUntil && !v.installmentsTotal) {
    ctx.addIssue({
      code: 'custom',
      path: ['recurrenceUntil'],
      message: 'Informe uma data final ou total de parcelas',
    })
  }

  if (v.installmentsTotal != null && v.installmentsPaid != null) {
    if (v.installmentsPaid > v.installmentsTotal) {
      ctx.addIssue({
        code: 'custom',
        path: ['installmentsPaid'],
        message: 'Parcelas pagas não podem exceder o total',
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
