import z from 'zod'

import { moneyStringSchema, planModeSchema, progressionTypeSchema } from './shared'

export const updateInvestmentPlanSchema = {
  tags: ['Investments'],
  description: 'Update personal investment plan',
  operationId: 'updateInvestmentPlan',
  params: z.object({ planId: z.string() }),
  body: z.object({
    assetId: z.string().optional(),
    mode: planModeSchema.optional(),
    progressionType: progressionTypeSchema.optional(),
    initialAmount: moneyStringSchema.optional(),
    initialQuantity: z.coerce.number().positive().optional(),
    stepAmount: moneyStringSchema.optional(),
    stepQuantity: z.coerce.number().min(0).optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    active: z.boolean().optional(),
  }),
  response: {
    200: z.object({
      plan: z.object({ id: z.string() }),
    }),
  },
}
