import { AlertCircle, Bell, CheckCircle2, Clock3 } from 'lucide-react'
import type { MouseEvent } from 'react'

import type { ListPendingNotifications200NotificationsItem } from '@/api/generated/model'
import { Button } from '@/components/ui/button'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

import {
  buildNotificationDisplay,
  notificationTitle,
  type NotificationDisplay,
} from '../lib/display'
import { readNotificationMetadata, type NotificationTone } from '../lib/kinds'

type Props = {
  notification: ListPendingNotifications200NotificationsItem
  isResponding: boolean
  onOpen: (notification: ListPendingNotifications200NotificationsItem) => void
  onAccept: (
    notification: ListPendingNotifications200NotificationsItem,
    event: MouseEvent
  ) => void
  onReject: (
    notification: ListPendingNotifications200NotificationsItem,
    event: MouseEvent
  ) => void
}

const toneIcon: Record<NotificationTone, typeof Bell> = {
  decision: CheckCircle2,
  overdue: AlertCircle,
  upcoming: Clock3,
  info: Bell,
}

const toneStyles: Record<NotificationTone, string> = {
  decision: 'bg-violet-50 text-violet-700',
  overdue: 'bg-rose-50 text-rose-700',
  upcoming: 'bg-amber-50 text-amber-700',
  info: 'bg-slate-100 text-slate-600',
}

function ToneIcon({ display }: { display: NotificationDisplay }) {
  const Icon = toneIcon[display.tone]
  return (
    <span
      className={cn(
        'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full',
        toneStyles[display.tone]
      )}
    >
      <Icon className="size-4" />
    </span>
  )
}

export function NotificationItem({
  notification,
  isResponding,
  onOpen,
  onAccept,
  onReject,
}: Props) {
  const metadata = readNotificationMetadata(notification.metadata)
  const display = buildNotificationDisplay({
    ...notification,
    metadata,
  })

  return (
    <DropdownMenuItem
      className="flex cursor-pointer items-start gap-2.5 rounded-xl px-2 py-2.5 focus:bg-slate-50"
      onClick={() => {
        if (!display.isDecision) onOpen(notification)
      }}
      onSelect={event => {
        if (display.isDecision) event.preventDefault()
      }}
    >
      <ToneIcon display={display} />
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <p className="line-clamp-2 text-sm font-medium leading-snug text-slate-900">
            {notificationTitle({ ...notification, metadata })}
          </p>
          <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
            {display.relativeTime}
          </span>
        </div>
        {display.subtitle && (
          <p className="line-clamp-2 text-xs leading-snug text-muted-foreground">
            {display.subtitle}
          </p>
        )}
        {display.isDecision && (
          <div className="flex w-full gap-2 pt-1">
            <Button
              type="button"
              size="sm"
              className="h-7 flex-1"
              disabled={isResponding}
              onClick={event => onAccept(notification, event)}
            >
              Confirmar
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 flex-1"
              disabled={isResponding}
              onClick={event => onReject(notification, event)}
            >
              Recusar
            </Button>
          </div>
        )}
      </div>
    </DropdownMenuItem>
  )
}
