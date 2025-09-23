import { useQuery } from '@tanstack/react-query'

import { useActiveOrganization } from './use-active-organization'

interface Installment {
  id: string
  installmentIndex: number
  dueDate: string
  amount: string
  status: 'pending' | 'paid' | 'canceled'
  paidAt: string | null
  valuePaid: number | null
  description: string | null
}

interface UseTransactionInstallmentsProps {
  seriesId: string
  enabled?: boolean
}

export function useTransactionInstallments({
  seriesId,
  enabled = true,
}: UseTransactionInstallmentsProps) {
  const { slug } = useActiveOrganization()

  return useQuery({
    queryKey: ['transaction-installments', slug, seriesId],
    queryFn: async (): Promise<Installment[]> => {
      const response = await fetch(`/api/org/${slug}/transaction/${seriesId}/installments`)
      if (!response.ok) {
        throw new Error('Failed to fetch installments')
      }
      const data = await response.json()
      return data.installments
    },
    enabled: enabled && !!seriesId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}
