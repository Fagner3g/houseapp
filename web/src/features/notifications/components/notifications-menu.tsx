import { Bell } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

import { useNotificationsMenu } from '../hooks/use-notifications-menu'
import { isDecisionNotification, readNotificationMetadata } from '../lib/kinds'
import { NotificationItem } from './notification-item'

export function NotificationsMenu() {
  const {
    isLoading,
    unreadCount,
    informationalCount,
    visible,
    hiddenCount,
    isResponding,
    isMarkingAll,
    handleOpen,
    handleMarkInformationalRead,
    handleAccept,
    handleReject,
  } = useNotificationsMenu()

  const hasDecisionOnly =
    informationalCount === 0 &&
    visible.some(n => isDecisionNotification(readNotificationMetadata(n.metadata)))

  return (
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
      <DropdownMenuContent align="end" className="w-[24rem] rounded-xl p-2">
        <div className="flex items-center justify-between gap-2 px-2 pb-1 pt-0.5">
          <DropdownMenuLabel className="p-0 text-sm font-semibold text-slate-900">
            Notificações
          </DropdownMenuLabel>
          {informationalCount > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-violet-700 hover:bg-violet-50 hover:text-violet-800"
              disabled={isMarkingAll}
              onClick={event => void handleMarkInformationalRead(event)}
            >
              Marcar todas como lidas
            </Button>
          )}
        </div>
        <DropdownMenuSeparator className="mb-1" />
        {isLoading ? (
          <p className="px-2 py-4 text-sm text-muted-foreground">Carregando...</p>
        ) : visible.length ? (
          <div className="max-h-[28rem] space-y-0.5 overflow-y-auto">
            {visible.map(notification => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                isResponding={isResponding}
                onOpen={item => void handleOpen(item)}
                onAccept={(item, event) => void handleAccept(item, event)}
                onReject={(item, event) => void handleReject(item, event)}
              />
            ))}
            {hiddenCount > 0 && (
              <p className="px-2 py-2 text-center text-[11px] text-muted-foreground">
                +{hiddenCount} não exibidas
                {informationalCount > 0 ? ' · use “Marcar todas como lidas”' : ''}
              </p>
            )}
          </div>
        ) : (
          <p className="px-2 py-4 text-sm text-muted-foreground">
            Nenhuma notificação pendente
          </p>
        )}
        {hasDecisionOnly && (
          <p className="px-2 pb-1 pt-2 text-[11px] text-muted-foreground">
            Confirmações de pagamento precisam de Confirmar ou Recusar.
          </p>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
