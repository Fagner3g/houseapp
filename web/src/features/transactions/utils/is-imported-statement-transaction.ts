export type ImportedStatementTransactionLike = {
  source: string
  statementId?: string | null
}

export function isImportedStatementTransaction(
  transaction: ImportedStatementTransactionLike | null | undefined
) {
  if (!transaction) return false
  return transaction.source === 'import' && !!transaction.statementId
}
