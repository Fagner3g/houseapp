import { createFileRoute, Outlet, redirect, useNavigate, useSearch } from '@tanstack/react-router'
import { useEffect } from 'react'

import { AiChatPanel } from '@/features/ai/ai-chat-panel'
import { AccountDrawer } from '@/features/accounts/components/account-drawer'
import { CardDrawer } from '@/features/accounts/components/card-drawer'
import { CategoryDrawer } from '@/features/categories/components/category-drawer'
import { PayInvoiceDrawer } from '@/features/credit-cards/components/pay-invoice-drawer'
import { AnalyticsGroupDrawer } from '@/features/credit-cards/components/analytics-group-drawer'
import { TransactionDrawer } from '@/features/transactions/components/transaction-drawer'
import { BottomNav, HeaderNewTransactionButton, AiChatFab } from '@/components/layout/app-chrome'
import { Header } from '@/components/layout/header'
import { SidebarCollapseTrigger } from '@/components/layout/sidebar/sidebar-collapse-trigger'
import { AppSidebar } from '@/components/layout/sidebar'
import { ModalNewOrganization } from '@/components/modal-new-organization'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { useAuthHydration } from '@/hooks/use-is-authenticated'
import { useOrgAccessGuard } from '@/hooks/use-org-access-guard'
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
  const { blocked: orgAccessBlocked } = useOrgAccessGuard()

  useEffect(() => {
    if (!isLoading && !isAuthed) {
      navigate({ to: '/sign-in' })
    }
  }, [isAuthed, isLoading, navigate])

  return (
    <SidebarProvider defaultOpen>
      <AppSidebar variant="inset" className="hidden md:flex" />
      <SidebarInset className="app-content-panel m-2 border-0 bg-white md:my-3 md:mr-3 md:ml-0 md:rounded-lg md:peer-data-[state=collapsed]:ml-0">
        <SidebarCollapseTrigger />
        <Header />
        <div className="flex-1 overflow-auto rounded-lg">
          {orgAccessBlocked ? (
            <div className="flex items-center justify-center p-12">
              <div className="flex flex-col items-center gap-3">
                <div className="size-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-600" />
                <p className="text-sm text-slate-500">Carregando organização...</p>
              </div>
            </div>
          ) : (
            <Outlet />
          )}
        </div>
        <ModalNewOrganization open={!!createOrg} onOpenChange={() => {}} />
        <BottomNav />
        <AiChatFab />
      </SidebarInset>
      <TransactionDrawer />
      <PayInvoiceDrawer />
      <AnalyticsGroupDrawer />
      <AccountDrawer />
      <CategoryDrawer />
      <CardDrawer />
      <AiChatPanel />
    </SidebarProvider>
  )
}
