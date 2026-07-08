import {
  isImportedStatementTransaction,
  type ImportedStatementTransactionLike,
} from './is-imported-statement-transaction'

export function canDeleteTransaction(
  transaction: ImportedStatementTransactionLike | null | undefined
) {
  if (!transaction) return false
  return !isImportedStatementTransaction(transaction)
}
