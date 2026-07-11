export function buildOwnerInvoiceDedupeKey(params: {
  accountId: string
  monthKey: string
  slot: string
  userId: string
  channel: string
}): string {
  return `owner-invoice:${params.accountId}:${params.monthKey}:${params.slot}:${params.userId}:${params.channel}`
}

export function buildOwnerTxDedupeKey(params: {
  transactionId: string
  slot: string
  userId: string
  channel: string
}): string {
  return `owner-tx:${params.transactionId}:${params.slot}:${params.userId}:${params.channel}`
}
