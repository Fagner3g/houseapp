import dayjs from 'dayjs'

/**
 * Current-month window for owner residual digests.
 * Future months are excluded; past months stay so overdue items keep alerting.
 */
export function isDueOnOrBeforeCurrentMonth(
  dueDate: Date,
  referenceDate = new Date()
): boolean {
  const dueMonth = dayjs(dueDate).startOf('month')
  const currentMonth = dayjs(referenceDate).startOf('month')
  return !dueMonth.isAfter(currentMonth)
}
