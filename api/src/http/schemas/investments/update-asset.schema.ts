import z from 'zod'

import { quotePreferenceSchema } from './shared'

export const updateInvestmentAssetSchema = {
  tags: ['Investments'],
  description: 'Update personal investment asset',
  operationId: 'updateInvestmentAsset',
  params: z.object({ assetId: z.string() }),
  body: z.object({
    symbol: z.string().trim().min(1).max(20).optional(),
    displayName: z.string().trim().min(1).max(80).optional(),
    assetClass: z.string().trim().min(1).max(40).optional(),
    quotePreference: quotePreferenceSchema.optional(),
    notes: z.string().trim().max(500).optional(),
    isActive: z.boolean().optional(),
  }),
  response: {
    200: z.object({
      asset: z.object({ id: z.string() }),
    }),
  },
}
