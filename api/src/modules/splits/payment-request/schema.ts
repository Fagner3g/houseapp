import z from 'zod'

import { splitPaymentResponseSchema, splitResponseSchema } from '../split.schema'

const slugParams = z.object({ slug: z.string() })
const splitParams = slugParams.extend({
  transactionId: z.string(),
  id: z.string(),
})
const requestParams = slugParams.extend({ requestId: z.string() })

export const splitPaymentRequestResponseSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  transactionId: z.string(),
  splitId: z.string(),
  requestedByUserId: z.string(),
  recipientUserId: z.string(),
  amount: z.string(),
  note: z.string().nullable(),
  status: z.string(),
  createdAt: z.string(),
  respondedAt: z.string().nullable(),
  transactionTitle: z.string().optional(),
  requesterName: z.string().optional(),
})

const createPaymentRequestBody = z.object({
  note: z.string().nullable().optional(),
})

export const createSplitPaymentRequestSchema = {
  tags: ['Splits'],
  description: 'Request the expense creditor to confirm a split payment',
  operationId: 'createSplitPaymentRequest',
  params: splitParams,
  body: createPaymentRequestBody,
  response: {
    201: z.object({ request: splitPaymentRequestResponseSchema }),
  },
}

export const listSplitPaymentRequestsSchema = {
  tags: ['Splits'],
  description: 'List pending split payment confirmation requests for the current user',
  operationId: 'listSplitPaymentRequests',
  params: slugParams,
  response: {
    200: z.object({ requests: z.array(splitPaymentRequestResponseSchema) }),
  },
}

export const acceptSplitPaymentRequestSchema = {
  tags: ['Splits'],
  description: 'Accept a split payment confirmation request and register the payment',
  operationId: 'acceptSplitPaymentRequest',
  params: requestParams,
  response: {
    200: z.object({
      request: splitPaymentRequestResponseSchema,
      payment: splitPaymentResponseSchema,
      split: splitResponseSchema,
    }),
  },
}

export const rejectSplitPaymentRequestSchema = {
  tags: ['Splits'],
  description: 'Reject a split payment confirmation request',
  operationId: 'rejectSplitPaymentRequest',
  params: requestParams,
  response: {
    200: z.object({ request: splitPaymentRequestResponseSchema }),
  },
}

export type CreateSplitPaymentRequestBody = z.infer<typeof createPaymentRequestBody>
