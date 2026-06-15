export interface OccurrenceUpdateFields {
  amount: boolean
  description: boolean
  dueDate: boolean
}

export interface SeriesUpdateFields {
  title: boolean
  type: boolean
  amount: boolean
  payToEmail: boolean
}

export interface TransactionUpdateScope {
  series: SeriesUpdateFields
  currentOccurrence: OccurrenceUpdateFields
  pendingOccurrences: OccurrenceUpdateFields
  tags: boolean
}

export function resolveTransactionUpdateScope(
  updateSeries: boolean | undefined
): TransactionUpdateScope {
  if (updateSeries === true) {
    return {
      series: { title: true, type: true, amount: true, payToEmail: true },
      currentOccurrence: { amount: true, description: true, dueDate: true },
      pendingOccurrences: { amount: true, description: true, dueDate: false },
      tags: true,
    }
  }

  return {
    series: { title: false, type: false, amount: false, payToEmail: false },
    currentOccurrence: { amount: true, description: true, dueDate: true },
    pendingOccurrences: { amount: false, description: false, dueDate: false },
    tags: false,
  }
}
