import { NavMain } from '@/components/layout/sidebar/nav-main'
import { NavUser } from '@/components/layout/sidebar/nav-user'
import { SidebarBrand } from '@/components/layout/sidebar/sidebar-brand'
import { TeamSwitcher } from '@/components/layout/sidebar/team-switcher'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from '@/components/ui/sidebar'
import { useNavItems } from '@/routes/navigation'
import { useAuthStore } from '@/stores/auth'

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const navItems = useNavItems()
  const user = useAuthStore.getState().user

  return (
    <Sidebar collapsible="icon" {...props} className="app-sidebar-panel">
      <SidebarHeader className="gap-3 px-5 pb-4 pt-6 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:pb-5 group-data-[collapsible=icon]:pt-6">
        <SidebarBrand />
        <div className="w-full group-data-[collapsible=icon]:hidden">
          <TeamSwitcher />
        </div>
      </SidebarHeader>
      <SidebarContent className="px-3 group-data-[collapsible=icon]:px-2">
        <NavMain items={navItems} />
      </SidebarContent>
      <SidebarFooter className="gap-2 px-3 pb-5 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:pb-6">
        {user && <NavUser user={user} />}
      </SidebarFooter>
    </Sidebar>
  )
}
