export function isSeriesTransaction(transaction: { installmentsTotal?: number | null }): boolean {
  return (
    transaction.installmentsTotal === null ||
    (typeof transaction.installmentsTotal === 'number' && transaction.installmentsTotal > 1)
  )
}
