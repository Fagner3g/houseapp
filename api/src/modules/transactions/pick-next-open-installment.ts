/** Next open installment after the current number (paid/canceled excluded). */
export function pickNextOpenInstallment<
  T extends {
    installmentNumber: number | null
    status: string
  },
>(siblings: T[], currentInstallmentNumber: number): T | undefined {
  return siblings
    .filter(row => {
      const number = row.installmentNumber ?? 0
      if (number <= currentInstallmentNumber) return false
      return row.status !== 'paid' && row.status !== 'canceled'
    })
    .sort((a, b) => (a.installmentNumber ?? 0) - (b.installmentNumber ?? 0))[0]
}
