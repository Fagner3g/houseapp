import dayjs from 'dayjs'

import { divideCentavos } from '@/core/money'

import { formatInstallmentTitle } from './credit-card-installments.logic'

export type InstallmentPeriodicity = {
  frequency: 'weekly' | 'monthly' | 'yearly'
  interval: number
}

const PERIODICITY_OPTIONS: Array<{
  value: string
  frequency: InstallmentPeriodicity['frequency']
  interval: number
}> = [
  { value: 'weekly-1', frequency: 'weekly', interval: 1 },
  { value: 'weekly-2', frequency: 'weekly', interval: 2 },
  { value: 'monthly-1', frequency: 'monthly', interval: 1 },
  { value: 'monthly-2', frequency: 'monthly', interval: 2 },
  { value: 'monthly-3', frequency: 'monthly', interval: 3 },
  { value: 'monthly-6', frequency: 'monthly', interval: 6 },
  { value: 'yearly-1', frequency: 'yearly', interval: 1 },
]

export function parseInstallmentPeriodicity(value: string | undefined | null): InstallmentPeriodicity {
  const option = PERIODICITY_OPTIONS.find(item => item.value === value) ?? PERIODICITY_OPTIONS[2]!
  return { frequency: option.frequency, interval: option.interval }
}

export type PeriodicInstallmentRow = {
  title: string
  amount: bigint
  date: Date
  competenceDate: Date
  installmentNumber: number
  installmentsTotal: number
}

export type BuildPeriodicInstallmentsInput = {
  title: string
  totalCentavos: bigint
  startDate: Date
  installmentsTotal: number
  periodicity?: string | null
}

function periodicInstallmentDate(
  startDate: Date,
  periodicity: InstallmentPeriodicity,
  installmentNumber: number
): Date {
  const offset = installmentNumber - 1
  const base = dayjs(startDate)

  if (periodicity.frequency === 'weekly') {
    return base
      .add(offset * periodicity.interval, 'week')
      .hour(12)
      .minute(0)
      .second(0)
      .millisecond(0)
      .toDate()
  }

  if (periodicity.frequency === 'yearly') {
    return base
      .add(offset * periodicity.interval, 'year')
      .hour(12)
      .minute(0)
      .second(0)
      .millisecond(0)
      .toDate()
  }

  return base
    .add(offset * periodicity.interval, 'month')
    .hour(12)
    .minute(0)
    .second(0)
    .millisecond(0)
    .toDate()
}

export function buildPeriodicInstallments(
  input: BuildPeriodicInstallmentsInput
): PeriodicInstallmentRow[] {
  const { title, totalCentavos, startDate, installmentsTotal, periodicity } = input

  if (installmentsTotal < 2) {
    throw new Error('installmentsTotal must be at least 2')
  }

  const parsedPeriodicity = parseInstallmentPeriodicity(periodicity)
  const amounts = divideCentavos(totalCentavos, installmentsTotal)

  return amounts.map((amount, index) => {
    const installmentNumber = index + 1
    const date = periodicInstallmentDate(startDate, parsedPeriodicity, installmentNumber)

    return {
      title: formatInstallmentTitle(title, installmentNumber, installmentsTotal),
      amount,
      date,
      competenceDate: date,
      installmentNumber,
      installmentsTotal,
    }
  })
}
