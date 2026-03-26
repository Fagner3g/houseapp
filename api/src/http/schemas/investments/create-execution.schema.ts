import z from 'zod'

import { moneyStringSchema, monthKeySchema } from './shared'

export const createInvestmentExecutionSchema = {
  tags: ['Investments'],
  description: 'Create or update a personal investment execution',
  operationId: 'createInvestmentExecution',
  body: z.object({
    assetId: z.string(),
    planId: z.string().optional(),
    referenceMonth: monthKeySchema,
    investedAmount: moneyStringSchema,
    executedQuantity: z.coerce.number().positive(),
    executedUnitPrice: moneyStringSchema,
    executedAt: z.coerce.date().optional(),
  }),
  response: {
    201: z.object({
      execution: z.object({ id: z.string() }),
    }),
  },
}
