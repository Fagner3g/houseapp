import z from 'zod'

const slugParams = z.object({ slug: z.string() })
const accountParams = slugParams.extend({ accountId: z.string() })
const statementParams = accountParams.extend({ id: z.string() })

const importSplitHintSchema = z.object({
  mode: z.enum(['half', 'custom', 'full_other']),
  userId: z.string().optional(),
  contactName: z.string().optional(),
  contactPhone: z.string().optional(),
  amount: z.string().optional(),
})

const importTransactionBody = z.object({
  title: z.string().min(1),
  amount: z.string(),
  date: z.string(),
  type: z.enum(['income', 'expense']).optional(),
  competenceDate: z.string().optional(),
  cardLastFour: z.string().length(4).optional(),
  installmentNumber: z.number().int().positive().optional(),
  installmentsTotal: z.number().int().positive().optional(),
  externalId: z.string().optional(),
  alternateExternalIds: z.array(z.string()).optional(),
  categoryIds: z.array(z.string()).optional(),
  counterparty: z.string().optional(),
  splitHint: importSplitHintSchema.optional(),
  isDuplicate: z.boolean().optional(),
  duplicateTransactionId: z.string().nullable().optional(),
  duplicateTransactionTitle: z.string().nullable().optional(),
})

const importStatementBody = z
  .object({
    fileHash: z.string().min(64).max(64),
    fileName: z.string().min(1),
    periodStart: z.string(),
    periodEnd: z.string(),
    closingDate: z.string(),
    dueDate: z.string(),
    totalAmount: z.string(),
    minimumPayment: z.string().optional(),
    previousBalance: z.string().optional(),
    paymentsReceived: z.string().optional(),
    purchasesTotal: z.string().optional(),
    otherCharges: z.string().optional(),
    nextInvoiceBalance: z.string().optional(),
    totalOpenBalance: z.string().optional(),
    importSource: z.enum(['ofx', 'xlsx']).optional(),
    isClosed: z.boolean().optional().default(false),
    isPaid: z.boolean().optional().default(false),
    paymentSourceAccountId: z.string().optional(),
    paymentDate: z.string().optional(),
    transactions: z.array(importTransactionBody).min(1),
  })
  .superRefine((data, ctx) => {
    if (data.isPaid && !data.isClosed) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Somente faturas fechadas podem ser marcadas como pagas',
        path: ['isPaid'],
      })
    }
  })

export const statementResponseSchema = z.object({
  id: z.string(),
  accountId: z.string(),
  organizationId: z.string(),
  periodStart: z.string().nullable(),
  periodEnd: z.string().nullable(),
  closingDate: z.string().nullable(),
  dueDate: z.string().nullable(),
  totalAmount: z.string().nullable(),
  minimumPayment: z.string().nullable(),
  previousBalance: z.string().nullable(),
  paymentsReceived: z.string().nullable(),
  purchasesTotal: z.string().nullable(),
  otherCharges: z.string().nullable(),
  nextInvoiceBalance: z.string().nullable(),
  totalOpenBalance: z.string().nullable(),
  transactionsCount: z.number(),
  fileHash: z.string(),
  fileName: z.string().nullable(),
  importSource: z.enum(['pdf', 'csv', 'ofx', 'xlsx']).nullable(),
  isClosed: z.boolean(),
  isPaid: z.boolean(),
  importedBy: z.string().nullable(),
  importedAt: z.string(),
})

export const listStatementsSchema = {
  tags: ['Statements'],
  description: 'List imported statements for an account',
  operationId: 'listStatements',
  params: accountParams,
  response: {
    200: z.object({ statements: z.array(statementResponseSchema) }),
  },
}

export const getStatementSchema = {
  tags: ['Statements'],
  description: 'Get statement by id',
  operationId: 'getStatement',
  params: statementParams,
  response: {
    200: z.object({ statement: statementResponseSchema }),
  },
}

export const importStatementSchema = {
  tags: ['Statements'],
  description: 'Bulk import statement transactions',
  operationId: 'importStatement',
  params: accountParams,
  body: importStatementBody,
  response: {
    201: z.object({
      statement: statementResponseSchema,
      transactionsCreated: z.number(),
      transactionsSkipped: z.number(),
      transactionIds: z.array(z.string()),
    }),
  },
}

const statementImportSummarySchema = z.object({
  expensesCount: z.number(),
  expensesTotal: z.string(),
  incomeCount: z.number(),
  incomeTotal: z.string(),
  installmentCount: z.number(),
  categorizedCount: z.number(),
  splitsInferredCount: z.number(),
  previewTransactions: z.array(
    z.object({
      title: z.string(),
      amount: z.string(),
      date: z.string(),
      type: z.enum(['income', 'expense']),
      installmentLabel: z.string().optional(),
      categoryId: z.string().optional(),
      categoryName: z.string().optional(),
    })
  ),
})

const statementDuplicateCheckSchema = z.object({
  isDuplicate: z.boolean(),
  mode: z.enum(['new', 'update', 'blocked']),
  matchType: z.enum(['file_hash', 'due_date']).nullable(),
  existingStatement: statementResponseSchema.nullable(),
  newTransactionsCount: z.number(),
  duplicateTransactionsCount: z.number(),
})

const statementInvoiceStatusSchema = z.object({
  kind: z.enum(['partial', 'closed_unpaid', 'closed_paid']),
  detectedClosed: z.boolean().nullable(),
  closedConfidence: z.enum(['high', 'manual']),
  suggestedPaid: z.boolean(),
  suggestedPaidReason: z.string(),
  importSource: z.enum(['ofx', 'xlsx']),
  defaultIsClosed: z.boolean(),
  defaultIsPaid: z.boolean(),
})

const parseStatementFileResponseSchema = z.object({
  parsed: importStatementBody,
  provider: z.enum(['ofx', 'xlsx']),
  transactionsCount: z.number(),
  extractedTextLength: z.number(),
  categorizedCount: z.number(),
  splitsInferredCount: z.number(),
  summary: statementImportSummarySchema,
  duplicate: statementDuplicateCheckSchema,
  invoiceStatus: statementInvoiceStatusSchema,
  cardMismatchWarning: z.string().nullable().optional(),
})

const suggestedCreditCardAccountSchema = z.object({
  name: z.string(),
  institution: z.string(),
  currency: z.string(),
  closingDay: z.number().int().min(1).max(31),
  dueDay: z.number().int().min(1).max(31).nullable(),
  creditLimit: z.string().nullable().optional(),
})

const statementAccountResolutionSchema = z.discriminatedUnion('mode', [
  z.object({
    mode: z.literal('existing'),
    accountId: z.string(),
    accountName: z.string(),
    autoProvisioned: z.boolean().optional(),
    autoReactivated: z.boolean().optional(),
  }),
  z.object({
    mode: z.literal('missing'),
    ofxAccountId: z.string().optional(),
    cardLastFour: z.string().length(4).optional(),
    suggestedAccount: suggestedCreditCardAccountSchema,
    uploadedOnAccountName: z.string().optional(),
  }),
  z.object({
    mode: z.literal('mismatch'),
    ofxAccountId: z.string().optional(),
    cardLastFour: z.string().length(4).optional(),
    expectedAccountId: z.string(),
    expectedAccountName: z.string(),
    uploadedOnAccountId: z.string(),
    uploadedOnAccountName: z.string(),
  }),
])

/** @deprecated Use statementAccountResolutionSchema */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _ofxAccountResolutionSchema = statementAccountResolutionSchema

const parseStatementWithResolutionResponseSchema = parseStatementFileResponseSchema.extend({
  accountResolution: statementAccountResolutionSchema,
})

const parseStatementOfxResponseSchema = parseStatementWithResolutionResponseSchema
const parseStatementXlsxResponseSchema = parseStatementWithResolutionResponseSchema

export const parseStatementXlsxSchema = {
  tags: ['Statements'],
  description: 'Parse Itaú paid-invoice XLSX export (multipart/form-data, field: file)',
  operationId: 'parseStatementXlsx',
  consumes: ['multipart/form-data'],
  params: accountParams,
  response: {
    200: parseStatementXlsxResponseSchema,
  },
}

export const parseStatementOfxSchema = {
  tags: ['Statements'],
  description: 'Parse Nubank closed-invoice OFX export (multipart/form-data, field: file)',
  operationId: 'parseStatementOfx',
  consumes: ['multipart/form-data'],
  params: accountParams,
  response: {
    200: parseStatementOfxResponseSchema,
  },
}

export const parseStatementOfxOrgSchema = {
  tags: ['Statements'],
  description:
    'Parse Nubank OFX and resolve credit card account by ACCTID (multipart/form-data, field: file)',
  operationId: 'parseStatementOfxOrg',
  consumes: ['multipart/form-data'],
  params: slugParams,
  response: {
    200: parseStatementOfxResponseSchema,
  },
}

export type ImportStatementBody = z.infer<typeof importStatementBody>
export type ImportTransactionBody = z.infer<typeof importTransactionBody>
