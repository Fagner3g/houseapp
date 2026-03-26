import { useRouterState } from '@tanstack/react-router'
import { Bell } from 'lucide-react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { useInvestmentReminders } from '@/features/investments/api'
import { useActiveOrganization } from '@/hooks/use-active-organization'
import { useSidebar } from '@/hooks/use-sidebar'
import { useGetInvite } from '@/api/generated/api'
import { ModeToggle } from '../mode-toggle'
import { Button } from '../ui/button'

export function Header() {
  const { route } = useSidebar()
  const { slug } = useActiveOrganization()
  const pathname = useRouterState({ select: s => s.location.pathname })
  const isInvestmentsRoute = pathname.startsWith('/investments')
  const { data } = useGetInvite(slug, { query: { enabled: !isInvestmentsRoute && !!slug } })
  const { data: reminders } = useInvestmentReminders(isInvestmentsRoute)
  const count = isInvestmentsRoute ? reminders?.summary.total ?? 0 : data?.invites.length ?? 0

  return (
    <header className="bg-background sticky top-0 flex shrink-0 items-center gap-2 border-b p-1 z-50">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6 group-data-[collapsible=icon]:hidden">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mx-2 data-[orientation=vertical]:h-4" />
        <p>{route?.title}</p>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="p-2" aria-label="Notificações">
            <Bell className="size-5" />
            {count}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="p-2 text-sm">
          {isInvestmentsRoute ? (
            reminders?.items?.length ? (
              <div className="space-y-2">
                {reminders.items.slice(0, 5).map(item => (
                  <p key={`${item.planId}-${item.referenceMonth}`}>
                    {item.assetSymbol}: {item.plannedAmount ? `R$ ${item.plannedAmount.toFixed(2)}` : `${item.plannedQuantity} un.`}
                  </p>
                ))}
              </div>
            ) : (
              <p>Nenhum aporte pendente</p>
            )
          ) : (
            <p>Nenhuma notificação</p>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <ModeToggle />
    </header>
  )
}
