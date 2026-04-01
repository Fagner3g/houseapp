import z from 'zod'

import { investmentPlanResponseSchema } from './shared'

export const listInvestmentPlansSchema = {
  tags: ['Investments'],
  description: 'List personal investment plans',
  operationId: 'listInvestmentPlans',
  response: {
    200: z.object({
      plans: z.array(investmentPlanResponseSchema),
    }),
  },
}
