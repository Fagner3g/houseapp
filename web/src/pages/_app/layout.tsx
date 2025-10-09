import { createFileRoute, Outlet, redirect, useNavigate, useSearch } from '@tanstack/react-router'
import { useEffect } from 'react'

import { TransactionDrawerProvider } from '@/components/drawer-transaction/transaction-drawer-context'
import { Header } from '@/components/layout/header'
import { AppSidebar } from '@/components/layout/sidebar'
import { ModalNewOrganization } from '@/components/modal-new-organization'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { useAuthHydration } from '@/hooks/use-is-authenticated'
import { getAuthToken } from '@/lib/auth'

export const Route = createFileRoute('/_app')({
  component: RouteComponent,
  beforeLoad: () => {
    const token = getAuthToken()
    if (!token) {
      throw redirect({ to: '/sign-in' })
    }
  },
})

function RouteComponent() {
  const navigate = useNavigate()
  const { createOrg = false } = useSearch({ strict: false }) as { createOrg?: boolean }
  const { isAuthed, isLoading } = useAuthHydration()

  useEffect(() => {
    if (!isLoading && !isAuthed) {
      navigate({ to: '/sign-in' })
    }
  }, [isAuthed, isLoading, navigate])

  return (
    <TransactionDrawerProvider>
      <SidebarProvider defaultOpen={false}>
        <AppSidebar variant="floating" collapsible="icon" />
        <SidebarInset>
          <Header />
          <Outlet />
          <ModalNewOrganization open={!!createOrg} onOpenChange={() => {}} />
        </SidebarInset>
      </SidebarProvider>
    </TransactionDrawerProvider>
  )
}
