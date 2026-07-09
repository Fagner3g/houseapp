import { useNavigate, useRouterState } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { Bell, Settings } from 'lucide-react'

import { HeaderNewTransactionButton } from '@/components/layout/app-chrome'

import {
  getListPendingNotificationsQueryKey,
  useListPendingNotifications,
  useMarkNotificationRead,
} from '@/api/generated/api'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useSidebar } from '@/hooks/use-sidebar'
import { useActiveOrganization } from '@/hooks/use-active-organization'
import { cn } from '@/lib/utils'
import { Button } from '../ui/button'

export function Header() {
  const navigate = useNavigate()
  const pathname = useRouterState({ select: s => s.location.pathname })
  const { route } = useSidebar()
  const { slug } = useActiveOrganization()
  const queryClient = useQueryClient()

  const { data, isLoading } = useListPendingNotifications({
    query: { refetchInterval: 60_000 },
  })
  const { mutateAsync: markRead } = useMarkNotificationRead()

  const notifications = data?.notifications ?? []
  const unreadCount = notifications.filter(n => !n.readAt).length

  const handleNotificationClick = async (id: string) => {
    try {
      await markRead({ id })
      queryClient.invalidateQueries({ queryKey: getListPendingNotificationsQueryKey() })
    } catch {
      // ignore mark-read errors in header
    }
  }

  const isOverdueTransactions = pathname.endsWith('/transactions/overdue')
  const isAccountsPage = pathname.includes('/accounts')

  return (
    <header
      className={cn(
        'flex shrink-0 items-center gap-3 px-5 lg:px-8',
        isAccountsPage ? 'py-3 lg:py-4' : 'py-5 lg:py-6'
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {!isOverdueTransactions && (
          <h1 className="truncate text-2xl font-semibold tracking-tight text-slate-900">
            {route?.title ?? 'Dashboard'}
          </h1>
        )}
      </div>
      <div className="flex items-center gap-2">
        <HeaderNewTransactionButton />
        {slug && (
          <Button
            variant="ghost"
            size="icon"
            className="rounded-lg md:hidden"
            aria-label="Configurações"
            onClick={() => navigate({ to: '/$org/settings/categories', params: { org: slug } })}
          >
            <Settings className="size-5 text-slate-500" />
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative rounded-lg"
              aria-label="Notificações"
            >
              <span className="relative inline-flex">
                <Bell className="size-5 text-slate-500" />
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-violet-600 text-[10px] font-bold text-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 rounded-lg p-2">
            {isLoading ? (
              <p className="px-2 py-3 text-sm text-muted-foreground">Carregando...</p>
            ) : notifications.length ? (
              notifications.slice(0, 8).map(notification => (
                <DropdownMenuItem
                  key={notification.id}
                  className="flex cursor-pointer flex-col items-start gap-1 rounded-lg py-2"
                  onClick={() => void handleNotificationClick(notification.id)}
                >
                  <p className="font-medium">{notification.title}</p>
                  {notification.body && (
                    <p className="text-xs text-muted-foreground">{notification.body}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground">
                    {dayjs(notification.createdAt).format('DD/MM HH:mm')}
                  </p>
                </DropdownMenuItem>
              ))
            ) : (
              <p className="px-2 py-3 text-sm text-muted-foreground">Nenhuma notificação pendente</p>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
