import z from 'zod'

const transactionTypeSchema = z.enum(['income', 'expense', 'transfer'])
const transactionStatusSchema = z.enum(['pending', 'partial', 'paid', 'canceled'])
const transactionSourceSchema = z.enum(['manual', 'import', 'recurring', 'ai_chat'])

const notifyTargetTypeSchema = z.enum(['member', 'contact'])

const notifyOverdueConfigSchema = z
  .union([
    z.object({ disabled: z.literal(true) }),
    z.object({
      frequency: z.enum(['daily', 'weekly', 'monthly']),
      interval: z.number().int().min(1),
    }),
  ])
  .nullable()

const notifyFieldsSchema = {
  notifyEnabled: z.boolean().optional(),
  notifyTargetType: notifyTargetTypeSchema.nullable().optional(),
  notifyUserId: z.string().nullable().optional(),
  notifyContactName: z.string().nullable().optional(),
  notifyContactPhone: z.string().nullable().optional(),
  notifyDaysBefore: z.array(z.number().int().min(0)).nullable().optional(),
  notifyOverdueConfig: notifyOverdueConfigSchema.optional(),
}

export const transactionResponseSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  accountId: z.string().nullable(),
  cardId: z.string().nullable(),
  recurringTransactionId: z.string().nullable(),
  statementId: z.string().nullable(),
  title: z.string(),
  description: z.string().nullable(),
  amount: z.string().nullable(),
  type: transactionTypeSchema,
  date: z.string(),
  competenceDate: z.string().nullable(),
  status: transactionStatusSchema,
  paidAt: z.string().nullable(),
  paidAmount: z.string().nullable(),
  paymentScheduledAt: z.string().nullable(),
  counterparty: z.string().nullable(),
  installmentNumber: z.number().nullable(),
  installmentsTotal: z.number().nullable(),
  source: transactionSourceSchema,
  categoryIds: z.array(z.string()),
  transferPairId: z.string().nullable(),
  notifyEnabled: z.boolean(),
  notifyTargetType: notifyTargetTypeSchema.nullable(),
  notifyUserId: z.string().nullable(),
  notifyContactName: z.string().nullable(),
  notifyContactPhone: z.string().nullable(),
  notifyDaysBefore: z.array(z.number().int().min(0)).optional(),
  notifyOverdueConfig: notifyOverdueConfigSchema.optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

const paginationSchema = z.object({
  page: z.number(),
  perPage: z.number(),
  total: z.number(),
  totalPages: z.number(),
})

const slugParams = z.object({ slug: z.string() })
const transactionParams = slugParams.extend({ id: z.string() })

const createTransactionBody = z.object({
  accountId: z.string().nullable().optional(),
  cardId: z.string().nullable().optional(),
  recurringTransactionId: z.string().nullable().optional(),
  statementId: z.string().nullable().optional(),
  transferPairId: z.string().nullable().optional(),
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  amount: z.string().nullable().optional(),
  type: transactionTypeSchema,
  date: z.string().datetime(),
  competenceDate: z.string().datetime().nullable().optional(),
  status: transactionStatusSchema.optional(),
  paidAt: z.string().datetime().nullable().optional(),
  paidAmount: z.string().nullable().optional(),
  counterparty: z.string().nullable().optional(),
  installmentNumber: z.number().int().nullable().optional(),
  installmentsTotal: z.number().int().nullable().optional(),
  installmentPeriodicity: z.string().nullable().optional(),
  source: transactionSourceSchema.optional(),
  categoryIds: z.array(z.string()).optional(),
  ...notifyFieldsSchema,
})

const updateTransactionBody = createTransactionBody.partial()

const payTransactionBody = z.object({
  paidAmount: z.string().nullable().optional(),
  paidAt: z.string().datetime().nullable().optional(),
  advanceTransactionIds: z.array(z.string()).optional(),
})

const installmentSeriesItemSchema = z.object({
  id: z.string(),
  installmentNumber: z.number(),
  date: z.string(),
  amount: z.string(),
  paidAmount: z.string().nullable(),
  remaining: z.string(),
  status: transactionStatusSchema,
})

const listTransactionsQuery = z.object({
  accountId: z.string().optional(),
  categoryId: z.string().optional(),
  status: transactionStatusSchema.optional(),
  type: transactionTypeSchema.optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  perPage: z.coerce.number().int().min(1).max(500).optional(),
  payableOnly: z.coerce.boolean().optional(),
})

export const listTransactionsSchema = {
  tags: ['Transactions'],
  description: 'List organization transactions with filters',
  operationId: 'listTransactions',
  params: slugParams,
  querystring: listTransactionsQuery,
  response: {
    200: z.object({
      transactions: z.array(transactionResponseSchema),
      pagination: paginationSchema,
    }),
  },
}

export const getTransactionSchema = {
  tags: ['Transactions'],
  description: 'Get transaction by id',
  operationId: 'getTransaction',
  params: transactionParams,
  response: {
    200: z.object({ transaction: transactionResponseSchema }),
  },
}

export const createTransactionSchema = {
  tags: ['Transactions'],
  description: 'Create transaction',
  operationId: 'createTransaction',
  params: slugParams,
  body: createTransactionBody,
  response: {
    201: z.object({
      transaction: transactionResponseSchema,
      installmentsCreated: z.number().int().optional(),
      transactions: z.array(transactionResponseSchema).optional(),
    }),
  },
}

export const bulkCreateTransactionsSchema = {
  tags: ['Transactions'],
  description: 'Bulk create transactions (statement import)',
  operationId: 'bulkCreateTransactions',
  params: slugParams,
  body: z.object({ transactions: z.array(createTransactionBody).min(1) }),
  response: {
    201: z.object({ transactions: z.array(transactionResponseSchema) }),
  },
}

export const updateTransactionSchema = {
  tags: ['Transactions'],
  description: 'Update transaction',
  operationId: 'updateTransaction',
  params: transactionParams,
  body: updateTransactionBody,
  response: {
    200: z.object({ transaction: transactionResponseSchema }),
  },
}

export const payTransactionSchema = {
  tags: ['Transactions'],
  description: 'Mark transaction as paid',
  operationId: 'payTransaction',
  params: transactionParams,
  body: payTransactionBody,
  response: {
    200: z.object({ transaction: transactionResponseSchema }),
  },
}

export const cancelTransactionPaymentSchema = {
  tags: ['Transactions'],
  description: 'Cancel a paid transaction and revert it to pending',
  operationId: 'cancelTransactionPayment',
  params: transactionParams,
  response: {
    200: z.object({ transaction: transactionResponseSchema }),
  },
}

const schedulePaymentBody = z.object({
  scheduledAt: z.string().datetime(),
})

export const scheduleTransactionPaymentSchema = {
  tags: ['Transactions'],
  description: 'Schedule a pending transaction payment (suppresses alerts until date)',
  operationId: 'scheduleTransactionPayment',
  params: transactionParams,
  body: schedulePaymentBody,
  response: {
    200: z.object({ transaction: transactionResponseSchema }),
  },
}

export const cancelScheduledTransactionPaymentSchema = {
  tags: ['Transactions'],
  description: 'Cancel a scheduled payment on a pending transaction',
  operationId: 'cancelScheduledTransactionPayment',
  params: transactionParams,
  response: {
    200: z.object({ transaction: transactionResponseSchema }),
  },
}

export const getInstallmentSeriesSchema = {
  tags: ['Transactions'],
  description: 'List installment siblings for a transaction series',
  operationId: 'getInstallmentSeries',
  params: transactionParams,
  response: {
    200: z.object({
      installments: z.array(installmentSeriesItemSchema),
    }),
  },
}

export const deleteTransactionSchema = {
  tags: ['Transactions'],
  description: 'Delete transaction',
  operationId: 'deleteTransaction',
  params: transactionParams,
  response: {
    204: z.null(),
  },
}

const bulkNotifyTargetItem = z
  .object({
    transactionId: z.string(),
    ...notifyFieldsSchema,
  })
  .superRefine((value, ctx) => {
    if (!value.notifyEnabled) return

    if (!value.notifyTargetType) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'notifyTargetType is required when notifyEnabled is true',
        path: ['notifyTargetType'],
      })
    }
  })

export const bulkNotifyTargetSchema = {
  tags: ['Transactions'],
  description: 'Bulk assign notify targets to transactions (post-import review)',
  operationId: 'bulkNotifyTarget',
  params: slugParams,
  body: z.object({ updates: z.array(bulkNotifyTargetItem).min(1) }),
  response: {
    200: z.object({ transactions: z.array(transactionResponseSchema) }),
  },
}

const bulkReviewImportSplit = z.object({
  userId: z.string().nullable().optional(),
  contactName: z.string().nullable().optional(),
  contactPhone: z.string().nullable().optional(),
  amount: z.string(),
  description: z.string().nullable().optional(),
})

const bulkReviewImportItem = z.object({
  transactionId: z.string(),
  categoryIds: z.array(z.string()).optional(),
  split: bulkReviewImportSplit.optional(),
})

export const bulkReviewImportSchema = {
  tags: ['Transactions'],
  description: 'Bulk review imported transactions (categories and splits)',
  operationId: 'bulkReviewImport',
  params: slugParams,
  body: z.object({ updates: z.array(bulkReviewImportItem).min(1) }),
  response: {
    200: z.object({
      transactions: z.array(transactionResponseSchema),
      splitsCreated: z.number(),
    }),
  },
}

export type CreateTransactionBody = z.infer<typeof createTransactionBody>
export type UpdateTransactionBody = z.infer<typeof updateTransactionBody>
export type PayTransactionBody = z.infer<typeof payTransactionBody>
export type SchedulePaymentBody = z.infer<typeof schedulePaymentBody>
export type ListTransactionsQuery = z.infer<typeof listTransactionsQuery>
export type BulkNotifyTargetBody = z.infer<typeof bulkNotifyTargetItem>
export type BulkReviewImportBody = z.infer<typeof bulkReviewImportItem>
