import z from 'zod'

const accountTypeSchema = z.enum(['checking', 'savings', 'credit_card', 'cash', 'investment'])
const pixKeyTypeSchema = z.enum(['cpf', 'cnpj', 'email', 'phone', 'random'])
const cardBrandSchema = z.enum(['visa', 'mastercard', 'elo', 'amex'])

const cardSummarySchema = z.object({
  id: z.string(),
  label: z.string(),
  type: z.string(),
  brand: z.string().nullable(),
  status: z.string(),
  lastFourDigits: z.string().nullable(),
})

export const accountResponseSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  name: z.string(),
  type: accountTypeSchema,
  institution: z.string().nullable(),
  currency: z.string(),
  creditLimit: z.string().nullable(),
  closingDay: z.number().nullable(),
  dueDay: z.number().nullable(),
  paymentAccountId: z.string().nullable(),
  initialBalance: z.string(),
  pixKey: z.string().nullable(),
  pixKeyType: pixKeyTypeSchema.nullable(),
  color: z.string().nullable(),
  icon: z.string().nullable(),
  displayOrder: z.number(),
  isActive: z.boolean(),
  ofxAccountId: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  cards: z.array(cardSummarySchema).optional(),
  cardCount: z.number().int().optional(),
})

const slugParams = z.object({ slug: z.string() })
const accountParams = slugParams.extend({ id: z.string() })

const accountBodyFields = z.object({
  name: z.string().min(1),
  type: accountTypeSchema,
  institution: z.string().nullable().optional(),
  currency: z.string().optional(),
  creditLimit: z.string().nullable().optional(),
  closingDay: z.number().int().min(1).max(31).nullable().optional(),
  dueDay: z.number().int().min(1).max(31).nullable().optional(),
  paymentAccountId: z.string().nullable().optional(),
  initialBalance: z.string().nullable().optional(),
  pixKey: z.string().nullable().optional(),
  pixKeyType: pixKeyTypeSchema.nullable().optional(),
  color: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  displayOrder: z.number().int().optional(),
  brand: cardBrandSchema.nullable().optional(),
  holderName: z.string().nullable().optional(),
  ofxAccountId: z.string().nullable().optional(),
  lastFourDigits: z.string().length(4).nullable().optional(),
})

const createAccountBody = accountBodyFields.superRefine((body, ctx) => {
  if (body.type === 'investment' && !body.institution?.trim()) {
    ctx.addIssue({
      code: 'custom',
      message: 'Investment accounts require an institution',
      path: ['institution'],
    })
  }
})

const updateAccountBody = accountBodyFields
  .omit({ type: true, brand: true, holderName: true })
  .partial()

export const listAccountsSchema = {
  tags: ['Accounts'],
  description: 'List organization accounts',
  operationId: 'listAccounts',
  params: slugParams,
  response: {
    200: z.object({ accounts: z.array(accountResponseSchema) }),
  },
}

export const getAccountSchema = {
  tags: ['Accounts'],
  description: 'Get account by id',
  operationId: 'getAccount',
  params: accountParams,
  response: {
    200: z.object({ account: accountResponseSchema }),
  },
}

export const createAccountSchema = {
  tags: ['Accounts'],
  description: 'Create account (credit_card also creates primary card)',
  operationId: 'createAccount',
  params: slugParams,
  body: createAccountBody,
  response: {
    201: z.object({ account: accountResponseSchema }),
  },
}

export const updateAccountSchema = {
  tags: ['Accounts'],
  description: 'Update account',
  operationId: 'updateAccount',
  params: accountParams,
  body: updateAccountBody,
  response: {
    200: z.object({ account: accountResponseSchema }),
  },
}

export const deleteAccountSchema = {
  tags: ['Accounts'],
  description: 'Soft-delete account',
  operationId: 'deleteAccount',
  params: accountParams,
  response: {
    204: z.null(),
  },
}

export type CreateAccountBody = z.infer<typeof createAccountBody>
export type UpdateAccountBody = z.infer<typeof updateAccountBody>
