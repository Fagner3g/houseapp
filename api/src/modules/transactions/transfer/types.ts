export type CreateTransferInput = {
  fromAccountId: string
  toOrganizationSlug: string
  toAccountId: string
  amount: string
  date: string
  title?: string
  description?: string | null
}

export type TransferPairOrg = {
  id: string
  name: string
  slug: string
}

export type TransferPairSummary = {
  id: string
  organizationId: string
  organizationSlug: string
  organizationName: string
  accountId: string | null
  accountName: string | null
  type: 'income' | 'expense' | 'transfer'
}
