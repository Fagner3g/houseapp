import { NavMain } from '@/components/layout/sidebar/nav-main'
import { NavUser } from '@/components/layout/sidebar/nav-user'
import { TeamSwitcher } from '@/components/layout/sidebar/team-switcher'
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader } from '@/components/ui/sidebar'
import { data } from '@/routes'
import { useNavItems } from '@/routes/navigation'

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const navItems = useNavItems()
  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <TeamSwitcher />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}
