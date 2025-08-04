import { Bell } from 'lucide-react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { useSidebar } from '@/hooks/use-sidebar'
import { ModeToggle } from '../mode-toggle'
import { Button } from '../ui/button'

export function Header() {
  const { route } = useSidebar()

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
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="p-2 text-sm">
          <p>Nenhuma notificação</p>
        </DropdownMenuContent>
      </DropdownMenu>
      <ModeToggle />
    </header>
  )
}
