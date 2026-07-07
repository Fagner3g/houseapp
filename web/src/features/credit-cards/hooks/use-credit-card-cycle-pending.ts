import { useMemo } from 'react'
import dayjs from 'dayjs'

import { useListStatements } from '@/api/generated/api'
import type { BillingCycle } from '@/lib/billing-cycle'
import {
  findPreviousStatementForCycle,
  findStatementForCycle,
} from '@/lib/billing-cycle'
import {
  resolvePaymentPeriod,
  resolvePurchasesPeriod,
} from '@/lib/credit-card-invoice-metrics'
import { useActiveOrganization } from '@/hooks/use-active-organization'

import { useInvoiceCycleTransactions } from './use-invoice-cycle-transactions'

/** True while transactions for the selected billing cycle are not ready yet. */
export function useCreditCardCyclePending(
  accountId: string,
  cycle: BillingCycle,
  closingDay: number,
  dueDay: number,
  enabled = true
) {
  const { slug } = useActiveOrganization()

  const { data: statementsData, isPending: statementsPending } = useListStatements(
    slug,
    accountId,
    { query: { enabled: enabled && !!slug && !!accountId } }
  )

  const matchedStatement = useMemo(
    () =>
      findStatementForCycle(statementsData?.statements ?? [], cycle, {
        closingDay,
        dueDay,
      }),
    [statementsData?.statements, cycle, closingDay, dueDay]
  )

  const previousStatement = useMemo(
    () =>
      findPreviousStatementForCycle(
        statementsData?.statements ?? [],
        cycle,
        closingDay,
        dueDay
      ),
    [statementsData?.statements, cycle, closingDay, dueDay]
  )

  const paymentContext = useMemo(
    () => ({ previousStatement, closingDay, dueDay }),
    [previousStatement, closingDay, dueDay]
  )

  const purchasesPeriod = resolvePurchasesPeriod(cycle, matchedStatement)
  const paymentPeriod = resolvePaymentPeriod(cycle, matchedStatement, paymentContext)

  const dateFromIso = dayjs(purchasesPeriod.start).startOf('day').toISOString()
  const dateToIso = dayjs(paymentPeriod.end).endOf('day').toISOString()

  const { isPending: transactionsPending } = useInvoiceCycleTransactions(
    slug,
    { accountId, dateFrom: dateFromIso, dateTo: dateToIso, perPage: 100 },
    enabled && !!slug && !!accountId
  )

  return statementsPending || transactionsPending
}
