export type ExpenseCreditorInput = {
  cardId: string | null
  cardUserId: string | null
  transactionCreatedBy: string | null
  accountCreatedBy: string | null
  orgOwnerId: string | null
}

/**
 * Creditor of an expense (who can mark split payments):
 * - assigned card → card.userId
 * - checking / no card → transaction.createdBy (null → org owner)
 * - unassigned card → account.createdBy (null → org owner)
 */
export function resolveExpenseCreditorUserId(input: ExpenseCreditorInput): string | null {
  if (input.cardId != null) {
    if (input.cardUserId != null) return input.cardUserId
    return input.accountCreatedBy ?? input.orgOwnerId
  }

  return input.transactionCreatedBy ?? input.orgOwnerId
}
