import { useListStatements } from '@/api/generated/api'
import { useActiveOrganization } from '@/hooks/use-active-organization'

/** True when the credit card account has never had a statement import (OFX or XLSX). */
export function useAllowsManualCreditCardTransactions(accountId: string) {
  const { slug } = useActiveOrganization()

  const { data, isPending } = useListStatements(slug, accountId, {
    query: { enabled: !!slug && !!accountId },
  })

  const allowsManual = (data?.statements?.length ?? 0) === 0

  return { allowsManual, isPending }
}
