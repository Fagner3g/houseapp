export function transactionPurchaseDate(tx: { date: string; competenceDate?: string | null }) {
  return tx.competenceDate ?? tx.date
}
