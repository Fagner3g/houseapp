import { createFileRoute, Outlet, redirect, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'

import { Header } from '@/components/layout/header'
import { AppSidebar } from '@/components/layout/sidebar'
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
  const { isAuthed, isLoading } = useAuthHydration()

  useEffect(() => {
    if (!isLoading && !isAuthed) {
      navigate({ to: '/sign-in' })
    }
  }, [isAuthed, isLoading, navigate])

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
