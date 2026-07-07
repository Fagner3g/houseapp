type TransactionLike = {
  source: string
  statementId?: string | null
}

export function canDeleteTransaction(transaction: TransactionLike | null | undefined) {
  if (!transaction) return false
  if (transaction.source === 'import' && transaction.statementId) return false
  return true
}
