import { canMutateTransaction, type TransactionViewer } from './transaction-visibility'

/**
 * Who may pay / cancel payment / schedule payment.
 * Creator always; otherwise the expense creditor (legacy null createdBy → org owner).
 */
export function canSettleTransaction(
  viewer: TransactionViewer,
  createdBy: string | null | undefined,
  creditorUserId: string | null | undefined
): boolean {
  if (canMutateTransaction(viewer, createdBy)) return true
  return creditorUserId != null && creditorUserId === viewer.userId
}
