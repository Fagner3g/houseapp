import z from 'zod'

import { moneyStringSchema } from './shared'

export const setInvestmentQuoteSchema = {
  tags: ['Investments'],
  description: 'Set manual quote for an asset',
  operationId: 'setInvestmentQuote',
  params: z.object({ assetId: z.string() }),
  body: z.object({
    price: moneyStringSchema,
  }),
  response: {
    200: z.object({
      quote: z.object({
        id: z.string(),
      }),
    }),
  },
}
