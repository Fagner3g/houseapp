export type ResidualTransaction = {
  id: string
  organizationId: string
  accountId: string | null
  accountName: string | null
  title: string
  amount: bigint | null
  paidAmount: bigint | null
  date: Date
  competenceDate: Date | null
  type: 'income' | 'expense' | 'transfer'
  installmentNumber: number | null
  accountType: string | null
  closingDay: number | null
  dueDay: number | null
  notifyEnabled: boolean
  cardId: string | null
  cardUserId: string | null
  transactionCreatedBy: string | null
  accountCreatedBy: string | null
}

export type OwnerInvoiceAlert = {
  accountId: string
  accountName: string
  monthKey: string
  dueDate: Date
  remainingCentavos: bigint
  daysUntilDue: number
  transactionIds: string[]
  accountCreatedBy: string | null
}

export type OwnerTxAlert = {
  transaction: ResidualTransaction
  dueDate: Date
  daysUntilDue: number
  remainingCentavos: bigint
}

export type OwnerResidualCollection = {
  invoices: OwnerInvoiceAlert[]
  transactions: OwnerTxAlert[]
}
