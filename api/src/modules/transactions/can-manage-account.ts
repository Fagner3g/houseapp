import type { TransactionViewer } from './transaction-visibility'

/**
 * Permanent management rights: org owner, account creator, or assigned card holder.
 * Temporary split access alone does not grant settings.
 */
export function canManageAccount(
  viewer: TransactionViewer | undefined,
  account: { createdBy: string | null },
  cardUserIds: Array<string | null | undefined> = []
): boolean {
  if (!viewer || viewer.isOwner) return true
  if (account.createdBy === viewer.userId) return true
  return cardUserIds.some(userId => userId === viewer.userId)
}
