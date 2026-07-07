import { useMemo } from 'react'

import { useOverdueInvoiceSummaries } from '@/features/transactions/hooks/use-invoice-summary-rows'

export function useCardOverdueInvoices(accountId: string, enabled = true) {
  const overdueInvoices = useOverdueInvoiceSummaries(enabled)

  return useMemo(
    () => overdueInvoices.filter(invoice => invoice.accountId === accountId),
    [overdueInvoices, accountId]
  )
}
