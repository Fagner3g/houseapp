import z from 'zod'

const splitStatusSchema = z.enum(['pending', 'partial', 'paid', 'forgiven'])
const splitPaymentMethodSchema = z.enum(['pix', 'cash', 'transfer', 'other'])

export const splitResponseSchema = z.object({
  id: z.string(),
  transactionId: z.string(),
  userId: z.string().nullable(),
  contactName: z.string().nullable(),
  contactPhone: z.string().nullable(),
  contactEmail: z.string().nullable(),
  amount: z.string(),
  description: z.string().nullable(),
  status: splitStatusSchema,
  paidAmount: z.string(),
  paidAt: z.string().nullable(),
  isNotified: z.boolean(),
  lastNotifiedAt: z.string().nullable(),
  notifyEnabled: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const splitPaymentResponseSchema = z.object({
  id: z.string(),
  splitId: z.string(),
  amount: z.string(),
  paidAt: z.string(),
  method: splitPaymentMethodSchema.nullable(),
  note: z.string().nullable(),
  createdAt: z.string(),
})

export const pendingSplitResponseSchema = splitResponseSchema.extend({
  transactionTitle: z.string(),
  transactionDate: z.string(),
  transactionAmount: z.string().nullable(),
  personName: z.string().nullable(),
})

const slugParams = z.object({ slug: z.string() })
const transactionParams = slugParams.extend({ transactionId: z.string() })
const splitParams = transactionParams.extend({ id: z.string() })
const splitPaymentParams = splitParams.extend({ paymentId: z.string() })

const createSplitBody = z.object({
  userId: z.string().nullable().optional(),
  contactName: z.string().nullable().optional(),
  contactPhone: z.string().nullable().optional(),
  contactEmail: z.string().nullable().optional(),
  amount: z.string(),
  description: z.string().nullable().optional(),
  notifyEnabled: z.boolean().optional(),
})

const updateSplitBody = createSplitBody
  .partial()
  .extend({ status: splitStatusSchema.optional() })

const registerPaymentBody = z.object({
  amount: z.string(),
  paidAt: z.string().datetime().nullable().optional(),
  method: splitPaymentMethodSchema.nullable().optional(),
  note: z.string().nullable().optional(),
})

export const listSplitsSchema = {
  tags: ['Splits'],
  description: 'List splits for a transaction',
  operationId: 'listSplits',
  params: transactionParams,
  response: {
    200: z.object({ splits: z.array(splitResponseSchema) }),
  },
}

export const createSplitSchema = {
  tags: ['Splits'],
  description: 'Create a split for a transaction',
  operationId: 'createSplit',
  params: transactionParams,
  body: createSplitBody,
  response: {
    201: z.object({ split: splitResponseSchema }),
  },
}

export const updateSplitSchema = {
  tags: ['Splits'],
  description: 'Update a split',
  operationId: 'updateSplit',
  params: splitParams,
  body: updateSplitBody,
  response: {
    200: z.object({ split: splitResponseSchema }),
  },
}

export const deleteSplitSchema = {
  tags: ['Splits'],
  description: 'Delete a split',
  operationId: 'deleteSplit',
  params: splitParams,
  response: {
    204: z.null(),
  },
}

export const listSplitPaymentsSchema = {
  tags: ['Splits'],
  description: 'List payments for a split',
  operationId: 'listSplitPayments',
  params: splitParams,
  response: {
    200: z.object({ payments: z.array(splitPaymentResponseSchema) }),
  },
}

export const registerSplitPaymentSchema = {
  tags: ['Splits'],
  description: 'Register a partial or full payment for a split',
  operationId: 'registerSplitPayment',
  params: splitParams,
  body: registerPaymentBody,
  response: {
    201: z.object({
      payment: splitPaymentResponseSchema,
      split: splitResponseSchema,
    }),
  },
}

export const cancelSplitPaymentSchema = {
  tags: ['Splits'],
  description: 'Cancel a registered split payment',
  operationId: 'cancelSplitPayment',
  params: splitPaymentParams,
  response: {
    200: z.object({
      split: splitResponseSchema,
    }),
  },
}

export const listPendingSplitsSchema = {
  tags: ['Splits'],
  description: 'List pending/partial splits across organization (Quem me deve)',
  operationId: 'listPendingSplits',
  params: slugParams,
  response: {
    200: z.object({ splits: z.array(pendingSplitResponseSchema) }),
  },
}

export const listSplitTransactionIdsSchema = {
  tags: ['Splits'],
  description: 'List transaction ids that have splits',
  operationId: 'listSplitTransactionIds',
  params: slugParams,
  body: z.object({
    transactionIds: z.array(z.string()).max(500),
  }),
  response: {
    200: z.object({
      transactionIds: z.array(z.string()),
      fullyDelegated: z.array(
        z.object({
          transactionId: z.string(),
          delegateName: z.string(),
        })
      ),
      partiallyDivided: z.array(
        z.object({
          transactionId: z.string(),
          splitWithName: z.string(),
          splitAmount: z.string(),
          transactionAmount: z.string(),
        })
      ),
      splitPaidTotals: z.array(
        z.object({
          transactionId: z.string(),
          paidAmount: z.string(),
        })
      ),
    }),
  },
}

const splitDebtInstallmentSchema = z.object({
  installmentNumber: z.number(),
  transactionId: z.string(),
  transactionAmount: z.string(),
  splitId: z.string(),
  amount: z.string(),
  paidAmount: z.string(),
  status: splitStatusSchema,
})

const splitDebtPersonSchema = z.object({
  key: z.string(),
  name: z.string(),
  userId: z.string().nullable(),
  contactName: z.string().nullable(),
  contactPhone: z.string().nullable(),
  totalOwed: z.string(),
  totalPaid: z.string(),
  totalRemaining: z.string(),
  status: splitStatusSchema,
  installments: z.array(splitDebtInstallmentSchema),
})

export const getSplitDebtSummarySchema = {
  tags: ['Splits'],
  description: 'Get aggregated split debt summary for a transaction (including installment siblings)',
  operationId: 'getSplitDebtSummary',
  params: transactionParams,
  response: {
    200: z.object({
      purchaseTotal: z.string(),
      purchaseTotalIsEstimate: z.boolean(),
      myShareTotal: z.string(),
      installmentsTotal: z.number().nullable(),
      currentInstallmentNumber: z.number().nullable(),
      currentTransactionAmount: z.string().nullable(),
      persons: z.array(splitDebtPersonSchema),
    }),
  },
}

export type CreateSplitBody = z.infer<typeof createSplitBody>
export type UpdateSplitBody = z.infer<typeof updateSplitBody>
export type RegisterPaymentBody = z.infer<typeof registerPaymentBody>
export type ListSplitTransactionIdsBody = z.infer<
  typeof listSplitTransactionIdsSchema.body
>
