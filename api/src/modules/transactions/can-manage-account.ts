import type { TransactionViewer } from './transaction-visibility'

/**
 * Permanent management rights: account creator or assigned card holder.
 * Org owner role alone does not grant manage; temporary split access neither.
 * Missing viewer (system callers) is allowed.
 */
export function canManageAccount(
  viewer: TransactionViewer | undefined,
  account: { createdBy: string | null },
  cardUserIds: Array<string | null | undefined> = []
): boolean {
  if (!viewer) return true
  if (account.createdBy === viewer.userId) return true
  return cardUserIds.some(userId => userId === viewer.userId)
}
