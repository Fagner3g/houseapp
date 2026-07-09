import z from 'zod'

const recurringTypeSchema = z.enum(['income', 'expense'])
const recurringFrequencySchema = z.enum(['daily', 'weekly', 'monthly', 'yearly'])

export const recurringResponseSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  accountId: z.string().nullable(),
  title: z.string(),
  amount: z.string(),
  type: recurringTypeSchema,
  counterparty: z.string().nullable(),
  categoryId: z.string().nullable(),
  frequency: recurringFrequencySchema,
  interval: z.number(),
  startDate: z.string(),
  endDate: z.string().nullable(),
  installmentsTotal: z.number().nullable(),
  isActive: z.boolean(),
  lastGeneratedDate: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

const slugParams = z.object({ slug: z.string() })
const recurringParams = slugParams.extend({ id: z.string() })

const createRecurringBody = z.object({
  title: z.string().min(1),
  amount: z.string(),
  type: recurringTypeSchema,
  counterparty: z.string().nullable().optional(),
  categoryId: z.string().nullable().optional(),
  accountId: z.string().nullable().optional(),
  frequency: recurringFrequencySchema,
  interval: z.number().int().min(1).optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().nullable().optional(),
  installmentsTotal: z.number().int().min(1).nullable().optional(),
})

const updateRecurringBody = createRecurringBody.partial().extend({
  effectiveFrom: z.string().datetime().optional(),
})

const previewUpdateRecurringBody = updateRecurringBody

const previewUpdateImpactSchema = z.object({
  preservedPastCount: z.number(),
  updatedFuturePendingCount: z.number(),
  unchangedCount: z.number(),
})

export const listRecurringSchema = {
  tags: ['Recurring Transactions'],
  description: 'List active recurring transactions',
  operationId: 'listRecurringTransactions',
  params: slugParams,
  response: {
    200: z.object({ recurringTransactions: z.array(recurringResponseSchema) }),
  },
}

export const getRecurringSchema = {
  tags: ['Recurring Transactions'],
  description: 'Get recurring transaction by id',
  operationId: 'getRecurringTransaction',
  params: recurringParams,
  response: {
    200: z.object({ recurringTransaction: recurringResponseSchema }),
  },
}

export const createRecurringSchema = {
  tags: ['Recurring Transactions'],
  description: 'Create recurring transaction',
  operationId: 'createRecurringTransaction',
  params: slugParams,
  body: createRecurringBody,
  response: {
    201: z.object({
      recurringTransaction: recurringResponseSchema,
      materializedCount: z.number(),
      nextOccurrenceDate: z.string().nullable(),
    }),
  },
}

export const previewUpdateRecurringSchema = {
  tags: ['Recurring Transactions'],
  description: 'Preview impact of updating a recurring transaction contract',
  operationId: 'previewUpdateRecurringTransaction',
  params: recurringParams,
  body: previewUpdateRecurringBody,
  response: {
    200: z.object({
      current: recurringResponseSchema,
      proposed: recurringResponseSchema,
      impact: previewUpdateImpactSchema,
    }),
  },
}

export const updateRecurringSchema = {
  tags: ['Recurring Transactions'],
  description: 'Update recurring transaction',
  operationId: 'updateRecurringTransaction',
  params: recurringParams,
  body: updateRecurringBody,
  response: {
    200: z.object({ recurringTransaction: recurringResponseSchema }),
  },
}

export const deleteRecurringSchema = {
  tags: ['Recurring Transactions'],
  description: 'Deactivate recurring transaction',
  operationId: 'deleteRecurringTransaction',
  params: recurringParams,
  response: {
    204: z.null(),
  },
}

export type CreateRecurringBody = z.infer<typeof createRecurringBody>
export type UpdateRecurringBody = z.infer<typeof updateRecurringBody>
export type PreviewUpdateRecurringBody = z.infer<typeof previewUpdateRecurringBody>
