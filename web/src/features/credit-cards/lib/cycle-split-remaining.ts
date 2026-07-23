/** Sum remaining receivable reimbursements for transactions in the current invoice cycle. */
export function sumCycleSplitRemaining(
  transactionIds: Iterable<string>,
  receivableRemainingById: Map<string, number>
): number {
  let total = 0
  for (const id of transactionIds) {
    const remaining = receivableRemainingById.get(id)
    if (remaining != null && remaining > 0) {
      total += remaining
    }
  }
  return total
}

/** Sum of the viewer's unpaid debtor shares in the cycle. */
export function sumCycleViewerShareRemaining(
  transactionIds: Iterable<string>,
  viewerShareById: Map<string, { remainingAmount: number }>
): number {
  let total = 0
  for (const id of transactionIds) {
    const remaining = viewerShareById.get(id)?.remainingAmount
    if (remaining != null && remaining > 0) {
      total += remaining
    }
  }
  return total
}

/** Sum of the viewer's debtor share amounts in the cycle (paid or not). */
export function sumCycleViewerShareAmount(
  transactionIds: Iterable<string>,
  viewerShareById: Map<string, { amount: number }>
): number {
  let total = 0
  for (const id of transactionIds) {
    total += viewerShareById.get(id)?.amount ?? 0
  }
  return total
}

/** Transaction ids in the cycle with receivable split amount still to collect. */
export function cyclePendingSplitTransactionIds(
  transactionIds: Iterable<string>,
  receivableRemainingById: Map<string, number>
): Set<string> {
  const pending = new Set<string>()
  for (const id of transactionIds) {
    const remaining = receivableRemainingById.get(id)
    if (remaining != null && remaining > 0) {
      pending.add(id)
    }
  }
  return pending
}
