import z from 'zod'

import { moneyStringSchema, monthKeySchema } from './shared'

export const updateInvestmentExecutionSchema = {
  tags: ['Investments'],
  description: 'Update a personal investment execution',
  operationId: 'updateInvestmentExecution',
  params: z.object({
    executionId: z.string(),
  }),
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
    200: z.object({
      execution: z.object({ id: z.string() }),
    }),
  },
}
