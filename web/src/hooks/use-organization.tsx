import React from 'react'

import { http } from '@/http/client'

export type Organization = {
  id: string
  name: string
  createdAt: string
}

type OrganizationContextProps = {
  organizationId: string | null
  setOrganizationId: (id: string) => void
  organizations: Organization[]
  setOrganizations: React.Dispatch<React.SetStateAction<Organization[]>>
}

const OrganizationContext = React.createContext<OrganizationContextProps | null>(null)

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  const [organizationId, setOrganizationId] = React.useState<string | null>(null)
  const [organizations, setOrganizations] = React.useState<Organization[]>([])

  React.useEffect(() => {
    async function load() {
      const { organizations } = await http<{ organizations: Organization[] }>('/organizations', {
        method: 'GET',
      })
      setOrganizations(organizations)
      if (!organizationId && organizations.length > 0) {
        setOrganizationId(organizations[0].id)
      }
    }

    load().catch(console.error)
  }, [organizationId])
  return (
    <OrganizationContext.Provider
      value={{ organizationId, setOrganizationId, organizations, setOrganizations }}
    >
      {children}
    </OrganizationContext.Provider>
  )
}

export function useOrganization() {
  const context = React.useContext(OrganizationContext)
  if (!context) {
    throw new Error('useOrganization must be used within OrganizationProvider')
  }
  return context
}
