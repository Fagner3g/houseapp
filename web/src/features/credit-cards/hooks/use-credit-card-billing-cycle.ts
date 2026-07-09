import { useMemo } from 'react'

import { useListStatements } from '@/api/generated/api'
import type { ListAccounts200AccountsItem } from '@/api/generated/model'
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

  const context = useMemo(
    () => resolveBillingContextForMonth(account, data?.statements ?? [], monthKey),
    [account, data?.statements, monthKey]
  )

  return {
    ...context,
    closingDay: context.billingDays.closingDay,
    dueDay: context.billingDays.dueDay,
    isPending: account?.type === 'credit_card' ? isPending : false,
  }
}
