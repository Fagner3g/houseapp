import {
  currentBillingMonthKey,
  resolveStatementViewMonthKey,
} from '@/lib/billing-cycle'

type StatementLike = {
  periodStart?: string | null
  periodEnd?: string | null
  closingDate?: string | null
  dueDate?: string | null
}

/** Lexicographic max for `YYYY-MM` keys. */
export function maxBillingMonthKey(
  ...keys: Array<string | null | undefined>
): string | null {
  let max: string | null = null
  for (const key of keys) {
    if (!key) continue
    if (max == null || key > max) max = key
  }
  return max
}

export function latestImportedBillingMonthKey(
  statements: StatementLike[],
  closingDay: number,
  dueDay: number
): string | null {
  return maxBillingMonthKey(
    ...statements.map(st => resolveStatementViewMonthKey(st, closingDay, dueDay))
  )
}

/** Furthest month the invoice nav may open: today or the latest imported statement. */
export function latestNavigableBillingMonthKey(
  statements: StatementLike[],
  closingDay: number,
  dueDay: number,
  currentMonthKey = currentBillingMonthKey()
): string {
  return (
    maxBillingMonthKey(
      currentMonthKey,
      latestImportedBillingMonthKey(statements, closingDay, dueDay)
    ) ?? currentMonthKey
  )
}

export function canNavigateToNextBillingMonth(
  viewingMonthKey: string,
  latestNavigableMonthKey: string
): boolean {
  return viewingMonthKey < latestNavigableMonthKey
}
