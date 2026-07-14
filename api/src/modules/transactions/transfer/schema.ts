import z from 'zod'

import { transactionResponseSchema } from '../transaction.schema'

const slugParams = z.object({ slug: z.string() })

export const createTransferBodySchema = z.object({
  fromAccountId: z.string().min(1),
  toOrganizationSlug: z.string().min(1),
  toAccountId: z.string().min(1),
  amount: z.string().min(1),
  date: z.string().datetime(),
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
})

export type CreateTransferBody = z.infer<typeof createTransferBodySchema>

export const createTransferSchema = {
  tags: ['Transactions'],
  description: 'Create a paired transfer between payment accounts (same or different orgs)',
  operationId: 'createTransfer',
  params: slugParams,
  body: createTransferBodySchema,
  response: {
    201: z.object({
      from: transactionResponseSchema,
      to: transactionResponseSchema,
    }),
  },
}
