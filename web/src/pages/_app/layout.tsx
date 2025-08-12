import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'

import { Header } from '@/components/layout/header'
import { AppSidebar } from '@/components/layout/sidebar'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { useAuthStore } from '@/stores/auth'

export const Route = createFileRoute('/_app')({
  component: RouteComponent,
  beforeLoad: () => {
    const { user } = useAuthStore.getState()
    if (!user) throw redirect({ to: '/sign-in' })
  },
})

function RouteComponent() {
  return (
    <SidebarProvider defaultOpen={false}>
      <AppSidebar variant="floating" collapsible="icon" />
      <SidebarInset>
        <Header />
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  )
}
