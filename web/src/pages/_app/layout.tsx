import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import Cookies from 'universal-cookie'

import { Header } from '@/components/layout/header'
import { AppSidebar } from '@/components/layout/sidebar'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'

export const Route = createFileRoute('/_app')({
  component: RouteComponent,
  beforeLoad: async () => {
    const cookies = new Cookies()
    const token = cookies.get('houseapp:token')
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
