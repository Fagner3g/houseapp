import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { ChevronDown } from 'lucide-react'
import type React from 'react'
import type { JSX } from 'react'
import { useEffect, useState } from 'react'

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar'
import { useSidebar } from '@/hooks/use-sidebar'
import { matchNavItem } from '@/lib/nav'
import type { NavItem } from '@/routes/navigation'
import { cn } from '@/lib/utils'

function isChildActive(pathname: string, child: NonNullable<NavItem['children']>[number]) {
  const current = pathname.replace(/\/$/, '')
  return current === child.url || current.endsWith(`/${child.matchPrefix}`)
}

function isGroupActive(pathname: string, item: NavItem) {
  if (item.children?.length) {
    return item.children.some(child => isChildActive(pathname, child))
  }
  return matchNavItem(pathname, item)
}

export function NavMain({ items }: { items: NavItem[] }) {
  const pathname = useRouterState({ select: s => s.location.pathname })
  const navigate = useNavigate()
  const { isMobile, setOpenMobile, state, setOpen } = useSidebar()
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})

  useEffect(() => {
    setOpenGroups(current => {
      const next = { ...current }
      for (const item of items) {
        if (item.children?.length && isGroupActive(pathname, item)) {
          next[item.title] = true
        }
      }
      return next
    })
  }, [pathname, items])

  const handleNavigationClick = () => {
    if (isMobile) {
      setOpenMobile(false)
    }
  }

  const handleGroupClick = (item: NavItem) => {
    if (state === 'collapsed' && !isMobile) {
      setOpen(true)
    }

    setOpenGroups(current => ({ ...current, [item.title]: true }))

    const firstChild = item.children?.[0]
    if (firstChild) {
      handleNavigationClick()
      navigate({ to: firstChild.url })
    }
  }

  const toggleGroup = (title: string) => {
    if (state === 'collapsed' && !isMobile) {
      setOpen(true)
      setOpenGroups(current => ({ ...current, [title]: true }))
      return
    }

    setOpenGroups(current => ({ ...current, [title]: !current[title] }))
  }

  return (
    <SidebarGroup className="p-0">
      <SidebarGroupContent>
        <SidebarMenu className="gap-1 group-data-[collapsible=icon]:items-center">
          {items.map(item => {
            if (item.children?.length) {
              const groupActive = isGroupActive(pathname, item)
              const isOpen = openGroups[item.title] ?? groupActive

              return (
                <SidebarMenuItem key={item.title}>
                  <div className="flex items-center gap-0.5">
                    <SidebarMenuButton
                      type="button"
                      tooltip={item.title}
                      isActive={groupActive}
                      className="sidebar-nav-item sidebar-icon-btn flex-1"
                      onClick={() => handleGroupClick(item)}
                    >
                      {item.icon && (
                        <item.icon className="size-[18px] shrink-0 stroke-[1.75] text-slate-800" />
                      )}
                      <span className="flex-1 text-left">{item.title}</span>
                    </SidebarMenuButton>
                    <button
                      type="button"
                      aria-label={isOpen ? 'Recolher menu' : 'Expandir menu'}
                      className="mr-1 flex size-7 shrink-0 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-[#e0e0e0] hover:text-slate-700 group-data-[collapsible=icon]:hidden"
                      onClick={() => toggleGroup(item.title)}
                    >
                      <ChevronDown
                        className={cn('size-4 transition-transform', isOpen && 'rotate-180')}
                      />
                    </button>
                  </div>

                  {isOpen && (
                    <SidebarMenuSub className="mx-0 border-0 px-0 py-1 pl-3">
                      {item.children.map(child => {
                        const childActive = isChildActive(pathname, child)
                        return (
                          <SidebarMenuSubItem key={child.title}>
                            <SidebarMenuSubButton
                              isActive={childActive}
                              className="sidebar-nav-sub-item"
                              onClick={() => {
                                handleNavigationClick()
                                navigate({ to: child.url })
                              }}
                            >
                              {child.title}
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        )
                      })}
                    </SidebarMenuSub>
                  )}
                </SidebarMenuItem>
              )
            }

            const isActive = matchNavItem(pathname, item)

            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  tooltip={item.title}
                  isActive={isActive}
                  className="sidebar-nav-item sidebar-icon-btn"
                >
                  <Link to={item.url} search={item.search} onClick={handleNavigationClick}>
                    {item.icon && (
                      <item.icon className="size-[18px] shrink-0 stroke-[1.75] text-slate-800" />
                    )}
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
                {item.badge != null && item.badge > 0 && (
                  <SidebarMenuBadge>{item.badge}</SidebarMenuBadge>
                )}
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
