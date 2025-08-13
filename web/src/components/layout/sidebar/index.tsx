import { NavMain } from '@/components/layout/sidebar/nav-main'
import { NavUser } from '@/components/layout/sidebar/nav-user'
import { TeamSwitcher } from '@/components/layout/sidebar/team-switcher'
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader } from '@/components/ui/sidebar'
import { useNavItems } from '@/routes/navigation'
import { useAuthStore } from '@/stores/auth'

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const navItems = useNavItems()

  const user = useAuthStore.getState().user

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <TeamSwitcher />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} />
      </SidebarContent>
      <SidebarFooter>{user && <NavUser user={user} />}</SidebarFooter>
    </Sidebar>
  )
}
