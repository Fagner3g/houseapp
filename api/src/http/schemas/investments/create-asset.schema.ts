import z from 'zod'

import { quotePreferenceSchema } from './shared'

export const createInvestmentAssetSchema = {
  tags: ['Investments'],
  description: 'Create personal investment asset',
  operationId: 'createInvestmentAsset',
  body: z.object({
    symbol: z.string().trim().min(1).max(20),
    displayName: z.string().trim().min(1).max(80),
    assetClass: z.string().trim().min(1).max(40),
    quotePreference: quotePreferenceSchema.default('auto_with_manual_fallback'),
    notes: z.string().trim().max(500).optional(),
  }),
  response: {
    201: z.object({
      asset: z.object({ id: z.string() }),
    }),
  },
}
