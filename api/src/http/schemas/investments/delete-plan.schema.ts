import z from 'zod'

export const deleteInvestmentPlanSchema = {
  tags: ['Investments'],
  description: 'Delete personal investment plan',
  operationId: 'deleteInvestmentPlan',
  params: z.object({ planId: z.string() }),
  response: {
    204: z.null(),
  },
}
