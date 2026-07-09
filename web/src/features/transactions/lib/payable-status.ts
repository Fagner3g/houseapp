import dayjs from 'dayjs'

export type PayableStatusTx = {
  status: string
  date: string
  paymentScheduledAt?: string | null
}

export type PayableStatusBadge = {
  key: string
  label: string
  className: string
}

export function isFutureScheduled(tx: PayableStatusTx): boolean {
  if (!tx.paymentScheduledAt || tx.status !== 'pending') return false
  return dayjs(tx.paymentScheduledAt).isAfter(dayjs())
}

export type PayableStatusOptions = {
  isPartiallyPaid?: boolean
}

export function isOverduePayable(tx: PayableStatusTx): boolean {
  if (tx.status !== 'pending' && tx.status !== 'partial') return false
  return dayjs(tx.date).isBefore(dayjs().startOf('day'))
}

export function formatOverdueDays(days: number): string {
  if (days === 1) return 'Vencida há 1 dia'
  return `Vencida há ${days} dias`
}

export function formatUpcomingDays(days: number): string {
  if (days === 0) return 'Vence hoje'
  if (days === 1) return 'Vence amanhã'
  return `Vence em ${days} dias`
}

export function getOverdueDays(tx: PayableStatusTx): number | null {
  if (!isOverduePayable(tx)) return null
  return dayjs().startOf('day').diff(dayjs(tx.date).startOf('day'), 'day')
}

export function getDaysUntilDue(tx: PayableStatusTx): number | null {
  if (tx.status !== 'pending' && tx.status !== 'partial') return null
  const due = dayjs(tx.date).startOf('day')
  const today = dayjs().startOf('day')
  if (due.isBefore(today)) return null
  return due.diff(today, 'day')
}

export function getPayableStatusBadges(
  tx: PayableStatusTx,
  options?: PayableStatusOptions
): PayableStatusBadge[] {
  if (tx.status !== 'pending' && tx.status !== 'partial') return []

  const badges: PayableStatusBadge[] = []
  const isPartiallyPaid = options?.isPartiallyPaid || tx.status === 'partial'

  if (isPartiallyPaid) {
    badges.push({
      key: 'partial',
      label: 'Pagamento parcial',
      className: 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-50',
    })
  }

  if (isFutureScheduled(tx)) {
    badges.push({
      key: 'scheduled',
      label: `Agendado para ${dayjs(tx.paymentScheduledAt).format('DD/MM/YYYY')}`,
      className: 'border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-50',
    })
  }

  const overdueDays = getOverdueDays(tx)
  if (overdueDays != null) {
    badges.push({
      key: 'overdue',
      label: formatOverdueDays(overdueDays),
      className: 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-50',
    })
  }

  const daysUntilDue = getDaysUntilDue(tx)
  if (daysUntilDue != null && !isFutureScheduled(tx)) {
    badges.push({
      key: 'upcoming',
      label: formatUpcomingDays(daysUntilDue),
      className: 'border-yellow-200 bg-yellow-50 text-yellow-800 hover:bg-yellow-50',
    })
  }

  if (badges.length === 0) {
    badges.push({
      key: 'pending',
      label: 'Pendente',
      className: 'border-slate-200 bg-white text-slate-700',
    })
  }

  return badges
}
