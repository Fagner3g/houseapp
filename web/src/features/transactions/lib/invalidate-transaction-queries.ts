import type { QueryClient } from '@tanstack/react-query'

import {
  getGetReportByCategoryQueryKey,
  getGetReportSummaryQueryKey,
  getGetReportTopMerchantsQueryKey,
  getListAccountsQueryKey,
  getListTransactionsQueryKey,
} from '@/api/generated/api'
import { notifyExtensionTransactionsChanged } from '@/lib/notify-extension'

export async function invalidateTransactionQueries(
  queryClient: QueryClient,
  slug: string
) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: getListTransactionsQueryKey(slug) }),
    queryClient.invalidateQueries({ queryKey: getListAccountsQueryKey(slug) }),
    queryClient.invalidateQueries({ queryKey: getGetReportSummaryQueryKey(slug) }),
    queryClient.invalidateQueries({ queryKey: getGetReportByCategoryQueryKey(slug) }),
    queryClient.invalidateQueries({ queryKey: getGetReportTopMerchantsQueryKey(slug) }),
  ])
  notifyExtensionTransactionsChanged()
}
