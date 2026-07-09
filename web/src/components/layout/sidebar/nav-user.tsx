import { ChevronRight, LogOut } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'

import { useSignOut } from '@/api/generated/api'
import type { GetProfile200User } from '@/api/generated/model'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { useActiveOrganization } from '@/hooks/use-active-organization'
import { useAuthStore } from '@/stores/auth'
import { cn } from '@/lib/utils'

interface NavUserProps {
  user: GetProfile200User
}

export function NavUser({ user }: NavUserProps) {
  const navigate = useNavigate()
  const logout = useAuthStore(s => s.logout)
  const { mutateAsync: signOutRequest } = useSignOut()
  const { isMobile, setOpenMobile } = useSidebar()
  const { slug } = useActiveOrganization()

  const handleLogout = async () => {
    await signOutRequest()
    logout()
    navigate({ to: '/sign-in' })
  }

  const openProfile = () => {
    if (!slug) return
    navigate({ to: '/$org/profile', params: { org: slug } })
    if (isMobile) setOpenMobile(false)
  }

  const iconBtnClass =
    'sidebar-icon-btn sidebar-footer-btn h-10 rounded-lg px-3 text-[13px] font-medium text-slate-700 hover:text-slate-900'

  return (
    <SidebarMenu className="gap-1 group-data-[collapsible=icon]:items-center">
      <SidebarMenuItem>
        <SidebarMenuButton
          tooltip={user.name}
          className={cn(iconBtnClass, 'hover:bg-white/70 group-data-[collapsible=icon]:overflow-visible')}
          onClick={openProfile}
        >
          <Avatar className="size-7 rounded-full">
            <AvatarImage src={user.avatarUrl} alt={user.name} />
            <AvatarFallback className="rounded-full bg-gradient-to-br from-orange-400 via-violet-500 to-rose-400 text-xs font-semibold text-white">
              {user.name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <span className="truncate text-sm font-medium text-slate-900 group-data-[collapsible=icon]:hidden">
            {user.name}
          </span>
          <ChevronRight className="ml-auto size-4 text-slate-400 group-data-[collapsible=icon]:hidden" />
        </SidebarMenuButton>
      </SidebarMenuItem>

      <SidebarMenuItem>
        <SidebarMenuButton
          tooltip="Sair"
          className={cn(
            iconBtnClass,
            'text-[#d32f2f] hover:bg-red-50 hover:text-[#c62828] [&_svg]:text-[#d32f2f]'
          )}
          onClick={handleLogout}
        >
          <LogOut className="size-[18px] stroke-[1.75]" />
          <span className="group-data-[collapsible=icon]:hidden">Sair</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
