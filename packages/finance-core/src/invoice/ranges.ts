import dayjs from 'dayjs'

export function transactionPurchaseDate(tx: { date: string; competenceDate?: string | null }) {
  return tx.competenceDate ?? tx.date
}

export function isWithinBillingRange(date: string, start: string, end: string) {
  const d = dayjs(date)
  const from = dayjs(start).startOf('day')
  const to = dayjs(end).endOf('day')
  return !d.isBefore(from) && !d.isAfter(to)
}
