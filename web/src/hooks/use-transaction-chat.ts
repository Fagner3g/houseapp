import { useQueryClient } from '@tanstack/react-query'

import {
  getListChatMessagesQueryKey,
  useCreateChatMessage as useCreateChatMessageGenerated,
  useListChatMessages,
} from '@/api/generated/api'
import { useActiveOrganization } from '@/hooks/use-active-organization'

export function useTransactionChatMessages(transactionId: string, page = 1, perPage = 20) {
  const { slug } = useActiveOrganization()

  return useListChatMessages(slug, transactionId, { page, perPage })
}

export function useCreateChatMessage(transactionId: string) {
  const queryClient = useQueryClient()
  const { slug } = useActiveOrganization()

  return useCreateChatMessageGenerated(
    {
      mutation: {
        onSuccess: () => {
          // Invalidar e refetch para garantir consistência
          queryClient.invalidateQueries({
            queryKey: getListChatMessagesQueryKey(slug, transactionId),
          })
        },
      },
    },
    queryClient
  )
}
