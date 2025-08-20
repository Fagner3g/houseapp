import z from 'zod'

export const payTransactionSchema = {
  tags: ['Transaction'],
  description: 'Mark current installment as paid',
  operationId: 'payTransaction',
  params: z.object({ slug: z.string(), id: z.string() }),
  response: { 204: z.null() },
}

export type PayTransactionSchemaParams = z.infer<typeof payTransactionSchema.params>
export type PayTransactionSchemaResponse = z.infer<typeof payTransactionSchema.response>
