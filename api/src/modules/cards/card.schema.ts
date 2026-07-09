import z from 'zod'

const cardTypeSchema = z.enum(['physical', 'virtual', 'additional'])
const cardStatusSchema = z.enum(['active', 'blocked', 'canceled'])
const cardBrandSchema = z.enum(['visa', 'mastercard', 'elo', 'amex'])
const cardBlockedReasonSchema = z.enum(['fraud', 'lost', 'stolen', 'preventive'])
const cardCanceledReasonSchema = z.enum([
  'fraud',
  'lost',
  'stolen',
  'requested',
  'expired',
  'upgrade',
])

export const cardResponseSchema = z.object({
  id: z.string(),
  accountId: z.string(),
  label: z.string(),
  lastFourDigits: z.string().nullable(),
  type: cardTypeSchema,
  holderName: z.string().nullable(),
  userId: z.string().nullable(),
  brand: cardBrandSchema.nullable(),
  status: cardStatusSchema,
  blockedAt: z.string().nullable(),
  blockedReason: cardBlockedReasonSchema.nullable(),
  canceledAt: z.string().nullable(),
  canceledReason: cardCanceledReasonSchema.nullable(),
  expiresAt: z.string().nullable(),
  isContactless: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

const slugParams = z.object({ slug: z.string() })
const accountCardParams = slugParams.extend({
  accountId: z.string(),
})
const cardParams = accountCardParams.extend({ id: z.string() })

const createCardBody = z.object({
  label: z.string().min(1),
  type: cardTypeSchema,
  lastFourDigits: z.string().length(4).nullable().optional(),
  holderName: z.string().nullable().optional(),
  userId: z.string().nullable().optional(),
  brand: cardBrandSchema.nullable().optional(),
  expiresAt: z.string().nullable().optional(),
  isContactless: z.boolean().optional(),
})

const updateCardBody = createCardBody.partial()

const blockCardBody = z.object({
  reason: cardBlockedReasonSchema,
})

const cancelCardBody = z.object({
  reason: cardCanceledReasonSchema.optional(),
})

export const listCardsSchema = {
  tags: ['Cards'],
  description: 'List cards for a credit card account',
  operationId: 'listCards',
  params: accountCardParams,
  response: {
    200: z.object({ cards: z.array(cardResponseSchema) }),
  },
}

export const getCardSchema = {
  tags: ['Cards'],
  description: 'Get card by id',
  operationId: 'getCard',
  params: cardParams,
  response: {
    200: z.object({ card: cardResponseSchema }),
  },
}

export const createCardSchema = {
  tags: ['Cards'],
  description: 'Create card on credit card account',
  operationId: 'createCard',
  params: accountCardParams,
  body: createCardBody,
  response: {
    201: z.object({ card: cardResponseSchema }),
  },
}

export const updateCardSchema = {
  tags: ['Cards'],
  description: 'Update card',
  operationId: 'updateCard',
  params: cardParams,
  body: updateCardBody,
  response: {
    200: z.object({ card: cardResponseSchema }),
  },
}

export const deleteCardSchema = {
  tags: ['Cards'],
  description: 'Cancel card (soft delete)',
  operationId: 'deleteCard',
  params: cardParams,
  body: cancelCardBody.optional(),
  response: {
    204: z.null(),
  },
}

export const blockCardSchema = {
  tags: ['Cards'],
  description: 'Block card',
  operationId: 'blockCard',
  params: cardParams,
  body: blockCardBody,
  response: {
    200: z.object({ card: cardResponseSchema }),
  },
}

export const unblockCardSchema = {
  tags: ['Cards'],
  description: 'Unblock card',
  operationId: 'unblockCard',
  params: cardParams,
  response: {
    200: z.object({ card: cardResponseSchema }),
  },
}

export type CreateCardBody = z.infer<typeof createCardBody>
export type UpdateCardBody = z.infer<typeof updateCardBody>
export type BlockCardBody = z.infer<typeof blockCardBody>
export type CancelCardBody = z.infer<typeof cancelCardBody>
