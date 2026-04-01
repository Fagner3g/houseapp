import z from 'zod'

export const deleteInvestmentAssetSchema = {
  tags: ['Investments'],
  description: 'Delete personal investment asset',
  operationId: 'deleteInvestmentAsset',
  params: z.object({ assetId: z.string() }),
  response: {
    204: z.null(),
  },
}
