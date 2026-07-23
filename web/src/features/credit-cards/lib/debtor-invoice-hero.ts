import dayjs from 'dayjs'

export type DebtorInvoiceHero = {
  isPaid: boolean
  isSettledEmpty: boolean
  isOverdue: boolean
  heroAmount: number
}

/**
 * Member/debtor KPI: status follows the viewer's unpaid share, not bank
 * invoice remaining (which is hidden / often already paid by the owner).
 */
export function resolveDebtorInvoiceHero(input: {
  dueDate: string
  shareTotal: number
  shareRemaining: number
  now?: dayjs.ConfigType
}): DebtorInvoiceHero {
  const shareTotal = input.shareTotal
  const shareRemaining = input.shareRemaining
  const isSettledEmpty = shareTotal <= 0
  const isPaid = shareRemaining <= 0 && shareTotal > 0
  const isOverdue =
    shareRemaining > 0 && dayjs(input.dueDate).isBefore(dayjs(input.now), 'day')
  const heroAmount = isPaid ? shareTotal : isSettledEmpty ? 0 : shareRemaining

  return { isPaid, isSettledEmpty, isOverdue, heroAmount }
}
