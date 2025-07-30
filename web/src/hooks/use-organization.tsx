import React from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  useCreateOrganization,
  useListOrganizations,
} from '@/http/generated/api'
import { useQueryClient } from '@tanstack/react-query'

export type Organization = {
  id: string
  name: string
  createdAt: string
}

interface OrganizationState {
  organizationId: string | null
  setOrganizationId: (id: string) => void
}

const useOrganizationStore = create<OrganizationState>()(
  persist(
    set => ({
      organizationId: null,
      setOrganizationId: id => set({ organizationId: id }),
    }),
    { name: 'organization-store' },
  ),
)

export function useOrganization() {
  const queryClient = useQueryClient()
  const store = useOrganizationStore()
  const { data } = useListOrganizations()
  const organizations = data?.organizations ?? []

  React.useEffect(() => {
    if (!store.organizationId && organizations.length > 0) {
      store.setOrganizationId(organizations[0].id)
    }
  }, [store, organizations])

  const createOrgMutation = useCreateOrganization(undefined, queryClient)

  return {
    organizationId: store.organizationId,
    setOrganizationId: store.setOrganizationId,
    organizations,
    createOrganization: createOrgMutation.mutateAsync,
  }
}
