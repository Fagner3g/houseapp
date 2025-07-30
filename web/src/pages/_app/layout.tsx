import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'

import { Header } from '@/components/layout/header'
import { AppSidebar } from '@/components/layout/sidebar'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { getAuthToken } from '@/lib/auth'

export const Route = createFileRoute('/_app')({
  component: RouteComponent,
  beforeLoad: async () => {
    const token = getAuthToken()
    if (!token) {
      throw redirect({ to: '/sign-in' })
    }
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
