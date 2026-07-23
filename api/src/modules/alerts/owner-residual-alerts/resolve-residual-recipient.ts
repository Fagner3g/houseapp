import { resolveExpenseCreditorUserId } from '@/modules/splits/resolve-expense-creditor'

import type { ResidualTransaction } from './types'

export function resolveResidualTxRecipientUserId(
  tx: Pick<
    ResidualTransaction,
    'cardId' | 'cardUserId' | 'transactionCreatedBy' | 'accountCreatedBy'
  >,
  orgOwnerId: string
): string {
  return (
    resolveExpenseCreditorUserId({
      cardId: tx.cardId,
      cardUserId: tx.cardUserId,
      transactionCreatedBy: tx.transactionCreatedBy,
      accountCreatedBy: tx.accountCreatedBy,
      orgOwnerId,
    }) ?? orgOwnerId
  )
}

export function resolveResidualInvoiceRecipientUserId(
  accountCreatedBy: string | null,
  orgOwnerId: string
): string {
  return accountCreatedBy ?? orgOwnerId
}
