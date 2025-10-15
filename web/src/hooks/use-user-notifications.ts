import { useQueryClient } from '@tanstack/react-query'

import { getListUsersByOrgQueryKey, usePatchOrgSlugUsersNotifications } from '@/api/generated/api'
import { useActiveOrganization } from '@/hooks/use-active-organization'

export function useUpdateUserNotifications() {
  const queryClient = useQueryClient()
  const { slug } = useActiveOrganization()

  return usePatchOrgSlugUsersNotifications({
    mutation: {
      onSuccess: () => {
        // Invalidar cache de usuários para refletir mudanças
        queryClient.invalidateQueries({
          queryKey: getListUsersByOrgQueryKey(slug),
        })
      },
    },
  })
}


