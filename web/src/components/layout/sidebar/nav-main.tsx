import { Link } from '@tanstack/react-router'
import type React from 'react'
import type { JSX } from 'react'

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { useSidebar } from '@/hooks/use-sidebar'

export function NavMain({
  items,
}: {
  items: {
    title: string
    url: string
    icon?: React.ComponentType<JSX.IntrinsicElements['svg']>
  }[]
}) {
  const { route, isMobile, setOpenMobile, setOpen } = useSidebar()

  const handleNavigationClick = () => {
    // Fechar o sidebar quando um item de navegação for clicado
    if (isMobile) {
      setOpenMobile(false)
    } else {
      setOpen(false)
    }
  }

  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          {items.map(item => (
            <Link 
              key={item.title} 
              to={item.url}
              onClick={handleNavigationClick}
            >
              <SidebarMenuItem>
                <SidebarMenuButton tooltip={item.title} isActive={route?.url === item.url}>
                  {item.icon && (
                    <item.icon
                      className={route?.url === item.url ? 'text-foreground' : 'text-foreground/60'}
                    />
                  )}
                  <span>{item.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </Link>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
