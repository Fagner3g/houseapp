import dayjs from 'dayjs'
import { z } from 'zod'

import type { GetRecurringTransaction200RecurringTransaction } from '@/api/generated/model'
import {
  formatTransactionPeriodicity,
  parseTransactionPeriodicity,
} from '@/features/transactions/constants'
import { calendarDateToIso } from '@/lib/date'
import { apiAmountToFormReais, optionalReaisToApiAmount } from '@/lib/currency'

export const contractSchema = z
  .object({
    title: z.string().min(1, 'Descrição obrigatória'),
    counterparty: z.string().optional(),
    amount: z.number().nullable(),
    accountId: z.string().min(1, 'Selecione uma conta'),
    categoryId: z.string().optional(),
    periodicity: z.string(),
    recurringDuration: z.enum(['infinite', 'times', 'until']),
    recurringRepetitions: z.coerce.number().int().min(1).optional(),
    recurringEndDate: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    if (values.recurringDuration === 'times' && !values.recurringRepetitions) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Informe o número de repetições',
        path: ['recurringRepetitions'],
      })
    }
    if (values.recurringDuration === 'until' && !values.recurringEndDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Informe a data final',
        path: ['recurringEndDate'],
      })
    }
  })

export type ContractFormValues = z.infer<typeof contractSchema>

export function resolveRecurringDuration(
  recurring: Pick<GetRecurringTransaction200RecurringTransaction, 'installmentsTotal' | 'endDate'>
): ContractFormValues['recurringDuration'] {
  if (recurring.installmentsTotal != null && recurring.installmentsTotal > 0) return 'times'
  if (recurring.endDate) return 'until'
  return 'infinite'
}

export function mapRecurringToFormValues(
  recurring: GetRecurringTransaction200RecurringTransaction
): ContractFormValues {
  const recurringDuration = resolveRecurringDuration(recurring)

  return {
    title: recurring.title,
    counterparty: recurring.counterparty ?? '',
    amount: apiAmountToFormReais(recurring.amount),
    accountId: recurring.accountId ?? '',
    categoryId: recurring.categoryId ?? '',
    periodicity: formatTransactionPeriodicity(recurring.frequency, recurring.interval),
    recurringDuration,
    recurringRepetitions: recurring.installmentsTotal ?? 2,
    recurringEndDate: recurring.endDate
      ? dayjs(recurring.endDate).format('YYYY-MM-DD')
      : dayjs().format('YYYY-MM-DD'),
  }
}

export function buildRecurringUpdatePayload(values: ContractFormValues) {
  const { frequency, interval } = parseTransactionPeriodicity(values.periodicity)
  return {
    title: values.title,
    // Recurring template amount is NOT NULL in DB; use 0 as reminder-without-value.
    amount: optionalReaisToApiAmount(values.amount) ?? '0.00',
    counterparty: values.counterparty?.trim() ? values.counterparty.trim() : null,
    accountId: values.accountId,
    categoryId: values.categoryId || null,
    frequency,
    interval,
    installmentsTotal:
      values.recurringDuration === 'times' ? values.recurringRepetitions ?? null : null,
    endDate:
      values.recurringDuration === 'until' && values.recurringEndDate
        ? calendarDateToIso(values.recurringEndDate)
        : null,
    effectiveFrom: calendarDateToIso(dayjs().format('YYYY-MM-DD')),
  }
}
