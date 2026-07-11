import { useMemo } from 'react'

import { useListStatements } from '@/api/generated/api'
import type { ListAccounts200AccountsItem } from '@/api/generated/model'
import { latestNavigableBillingMonthKey } from '@/features/credit-cards/lib/navigable-billing-month'
import { useActiveOrganization } from '@/hooks/use-active-organization'
import { resolveBillingContextForMonth } from '@/lib/billing-cycle'

export function useCreditCardBillingCycle(
  account: ListAccounts200AccountsItem | null | undefined,
  monthKey: string
) {
  const { slug } = useActiveOrganization()
  const accountId = account?.id ?? ''

  const { data, isPending } = useListStatements(slug, accountId, {
    query: { enabled: !!slug && !!accountId && account?.type === 'credit_card' },
  })

  const statements = data?.statements

  const context = useMemo(
    () => resolveBillingContextForMonth(account, statements ?? [], monthKey),
    [account, statements, monthKey]
  )

  const latestNavigableMonthKey = useMemo(
    () =>
      latestNavigableBillingMonthKey(
        statements ?? [],
        context.billingDays.closingDay,
        context.billingDays.dueDay
      ),
    [statements, context.billingDays.closingDay, context.billingDays.dueDay]
  )

  return {
    ...context,
    statements: statements ?? [],
    latestNavigableMonthKey,
    closingDay: context.billingDays.closingDay,
    dueDay: context.billingDays.dueDay,
    isPending: account?.type === 'credit_card' ? isPending : false,
  }
}
