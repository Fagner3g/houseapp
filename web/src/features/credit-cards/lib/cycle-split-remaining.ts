/** Sum remaining split reimbursements for transactions in the current invoice cycle. */
export function sumCycleSplitRemaining(
  transactionIds: Iterable<string>,
  splitRemainingById: Map<string, number>
): number {
  let total = 0
  for (const id of transactionIds) {
    const remaining = splitRemainingById.get(id)
    if (remaining != null && remaining > 0) {
      total += remaining
    }
  }
  return total
}

/** Transaction ids in the cycle that still have split amount to collect. */
export function cyclePendingSplitTransactionIds(
  transactionIds: Iterable<string>,
  splitRemainingById: Map<string, number>
): Set<string> {
  const pending = new Set<string>()
  for (const id of transactionIds) {
    const remaining = splitRemainingById.get(id)
    if (remaining != null && remaining > 0) {
      pending.add(id)
    }
  }
  return pending
}
