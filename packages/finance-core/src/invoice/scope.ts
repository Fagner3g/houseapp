import type { CreditCardReportScope, InvoiceStatementLike } from './types'

export function hasStoredInvoiceSummary(statement: InvoiceStatementLike | null): boolean {
  return statement?.purchasesTotal != null && statement?.previousBalance != null
}

export function buildCreditCardReportScope(
  matchedStatement: InvoiceStatementLike | null
): CreditCardReportScope {
  if (matchedStatement?.id) {
    return { statementId: matchedStatement.id }
  }

  return { excludeImported: true }
}
