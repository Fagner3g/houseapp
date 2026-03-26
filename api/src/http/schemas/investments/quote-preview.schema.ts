import z from 'zod'

export const getInvestmentQuotePreviewSchema = {
  tags: ['Investments'],
  description: 'Preview automatic quote support for a ticker',
  operationId: 'getInvestmentQuotePreview',
  querystring: z.object({
    symbol: z.string().trim().min(1),
  }),
  response: {
    200: z.object({
      preview: z.object({
        supported: z.boolean(),
        symbol: z.string(),
        price: z.number().nullable(),
        source: z.literal('auto'),
        message: z.string(),
      }),
    }),
  },
}
