type OccurrenceStatus = 'pending' | 'paid' | 'partial' | 'canceled'

interface SeriesRef {
  active: boolean
  installmentsTotal: number | null
}

interface OccurrenceRef {
  status: OccurrenceStatus
}

export function seriesHasMeaningfulActiveRef(
  series: SeriesRef,
  occurrences: OccurrenceRef[]
): boolean {
  if (!series.active) return false

  const hasUnpaid = occurrences.some(o => o.status === 'pending' || o.status === 'partial')
  if (hasUnpaid) return true

  if (series.installmentsTotal == null) return false

  const paidCount = occurrences.filter(o => o.status === 'paid').length
  const hasNonCanceled = occurrences.some(o => o.status !== 'canceled')

  return paidCount < series.installmentsTotal && hasNonCanceled
}
