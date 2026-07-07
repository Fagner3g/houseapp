import { useMemo } from 'react'

import { useListStatements } from '@/api/generated/api'
import type { ListAccounts200AccountsItem } from '@/api/generated/model'
import { useActiveOrganization } from '@/hooks/use-active-organization'
import { resolveAccountBillingDays } from '@/lib/billing-cycle'

export function useAccountBillingDays(
  account: ListAccounts200AccountsItem | null | undefined
) {
  const { slug } = useActiveOrganization()
  const accountId = account?.id ?? ''

  const { data, isPending } = useListStatements(slug, accountId, {
    query: { enabled: !!slug && !!accountId && account?.type === 'credit_card' },
  })

  const billingDays = useMemo(
    () => resolveAccountBillingDays(account, data?.statements ?? []),
    [account, data?.statements]
  )

  return {
    ...billingDays,
    isPending: account?.type === 'credit_card' ? isPending : false,
  }
}
