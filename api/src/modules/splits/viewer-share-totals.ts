export type ViewerShareRow = {
  transactionId: string
  amount: bigint
  remainingTotal: bigint
}

export type ViewerShareTotalDto = {
  transactionId: string
  amount: string
  remainingAmount: string
}

export function sumViewerShareAmounts(rows: Array<{ amount: bigint }>): bigint {
  return rows.reduce((sum, row) => sum + row.amount, 0n)
}

export function toViewerShareTotalDtos(
  rows: ViewerShareRow[],
  toMoney: (cents: bigint) => string | null
): ViewerShareTotalDto[] {
  return rows.map(row => ({
    transactionId: row.transactionId,
    amount: toMoney(row.amount) ?? '0.00',
    remainingAmount: toMoney(row.remainingTotal) ?? '0.00',
  }))
}
