import z from 'zod'

import { moneyStringSchema, planModeSchema, progressionTypeSchema } from './shared'

export const createInvestmentPlanSchema = {
  tags: ['Investments'],
  description: 'Create personal investment plan',
  operationId: 'createInvestmentPlan',
  body: z.object({
    assetId: z.string(),
    mode: planModeSchema,
    progressionType: progressionTypeSchema,
    initialAmount: moneyStringSchema.optional(),
    initialQuantity: z.coerce.number().positive().optional(),
    stepAmount: moneyStringSchema.optional(),
    stepQuantity: z.coerce.number().min(0).optional(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date().optional(),
    active: z.boolean().optional(),
  }),
  response: {
    201: z.object({
      plan: z.object({ id: z.string() }),
    }),
  },
}
