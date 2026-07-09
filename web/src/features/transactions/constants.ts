import type { CreateRecurringTransactionBodyFrequency } from '@/api/generated/model/createRecurringTransactionBodyFrequency'

export const TRANSACTION_PERIODICITY_OPTIONS = [
  { value: 'weekly-1', label: 'Semanal', frequency: 'weekly', interval: 1 },
  { value: 'weekly-2', label: 'Quinzenal', frequency: 'weekly', interval: 2 },
  { value: 'monthly-1', label: 'Mensal', frequency: 'monthly', interval: 1 },
  { value: 'monthly-2', label: 'Bimestral', frequency: 'monthly', interval: 2 },
  { value: 'monthly-3', label: 'Trimestral', frequency: 'monthly', interval: 3 },
  { value: 'monthly-6', label: 'Semestral', frequency: 'monthly', interval: 6 },
  { value: 'yearly-1', label: 'Anual', frequency: 'yearly', interval: 1 },
] as const satisfies ReadonlyArray<{
  value: string
  label: string
  frequency: CreateRecurringTransactionBodyFrequency
  interval: number
}>

export type TransactionPeriodicityValue =
  (typeof TRANSACTION_PERIODICITY_OPTIONS)[number]['value']

export function formatTransactionPeriodicity(
  frequency: string,
  interval: number
): TransactionPeriodicityValue {
  const match = TRANSACTION_PERIODICITY_OPTIONS.find(
    option => option.frequency === frequency && option.interval === interval
  )
  return match?.value ?? 'monthly-1'
}

export function parseTransactionPeriodicity(value: string | undefined) {
  const option = TRANSACTION_PERIODICITY_OPTIONS.find(item => item.value === value)
  return option ?? TRANSACTION_PERIODICITY_OPTIONS[2]
}

export const RECURRING_DURATION_OPTIONS = [
  { value: 'infinite', label: 'Sem limite' },
  { value: 'times', label: 'Limitar repetições' },
  { value: 'until', label: 'Até data' },
] as const

export type RecurringDurationValue = (typeof RECURRING_DURATION_OPTIONS)[number]['value']
