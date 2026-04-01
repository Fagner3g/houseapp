import z from 'zod'

import { investmentAssetResponseSchema } from './shared'

export const listInvestmentAssetsSchema = {
  tags: ['Investments'],
  description: 'List personal investment assets',
  operationId: 'listInvestmentAssets',
  response: {
    200: z.object({
      assets: z.array(investmentAssetResponseSchema),
    }),
  },
}
