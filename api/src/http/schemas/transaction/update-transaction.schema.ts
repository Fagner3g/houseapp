import z from 'zod'

import { toCentsStrict } from '@/http/utils/format'

const updateTransaction = z.object({
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
  serieId: z.string(),
  updateSeries: z.boolean().optional(),
  dueDate: z.coerce.date({ error: 'A data de vencimento é obrigatória' }),
  description: z.string().optional(),
  tags: z
    .array(z.object({ name: z.string().trim().min(1).transform(val => val.toLowerCase().trim()), color: z.string().trim().min(1) }))
    .optional(),
})

export const updateTransactionSchema = {
  tags: ['Transaction'],
  description: 'Update a transaction',
  operationId: 'updateTransaction',
  params: z.object({ slug: z.string(), id: z.string() }),
  body: updateTransaction,
  response: {
    204: z.null(),
  },
}

export type UpdateTransactionSchemaParams = z.infer<typeof updateTransactionSchema.params>
export type UpdateTransactionSchemaBody = z.infer<typeof updateTransactionSchema.body>
export type UpdateTransactionSchemaResponse = z.infer<typeof updateTransactionSchema.response>
