import { Link } from '@tanstack/react-router'
import { Bell, BriefcaseBusiness, MessageCircle, Puzzle, Smartphone } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Fragment } from 'react'

import { useListUsersByOrg } from '@/api/generated/api'
import { LoadingErrorState } from '@/components/loading-error-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { getAlertKindBadgeVariant, getAlertKindIconClass } from '@/lib/alert-status-colors'
import { useRecentDeliveries, type AlertDelivery, type ReminderChannel } from '../api'

type RecentDeliveriesCardProps = {
  slug: string
}

type UserDeliveryGroup = {
  userId: string
  recipientName: string
  isDeactivated: boolean
  deliveries: AlertDelivery[]
}

const CHANNEL_CONFIG: Record<ReminderChannel, { icon: LucideIcon; label: string }> = {
  whatsapp: { icon: MessageCircle, label: 'WhatsApp' },
  in_app: { icon: Smartphone, label: 'App' },
  extension: { icon: Puzzle, label: 'Extensão' },
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatKindLabel(kind: string) {
  const labels: Record<string, string> = {
    transaction_upcoming: 'Próximo vencimento',
    transaction_overdue: 'Transação vencida',
    reminder_due: 'Lembrete',
    reminder_upcoming: 'Lembrete próximo',
    reminder_overdue: 'Lembrete vencido',
    investment_due: 'Aporte pendente',
    investment_overdue: 'Aporte atrasado',
  }
  return labels[kind] ?? kind
}

function getAlertTitle(alert: AlertDelivery) {
  if (alert.sourceType === 'investment') {
    return (alert.payload.assetSymbol as string) ?? 'Aporte'
  }
  return (alert.payload.title as string) ?? 'Alerta'
}

function getSentAt(alert: AlertDelivery) {
  return alert.sentAt ?? alert.createdAt
}

function formatRecipientGroupLabel(name: string | null | undefined): string {
  const trimmed = name?.trim()
  if (!trimmed) return 'Usuário'
  return trimmed
}

function resolveRecipientName(
  delivery: AlertDelivery,
  userNameById: Map<string, string>
): string {
  return delivery.recipientName ?? userNameById.get(delivery.userId) ?? 'Usuário'
}

function groupDeliveriesByUser(
  deliveries: AlertDelivery[],
  userNameById: Map<string, string>,
  activeUserIds: Set<string>
): UserDeliveryGroup[] {
  const groups: UserDeliveryGroup[] = []
  const groupIndexByUserId = new Map<string, number>()

  for (const delivery of deliveries) {
    const existingIndex = groupIndexByUserId.get(delivery.userId)
    if (existingIndex != null) {
      groups[existingIndex].deliveries.push(delivery)
      continue
    }

    groupIndexByUserId.set(delivery.userId, groups.length)
    groups.push({
      userId: delivery.userId,
      recipientName: formatRecipientGroupLabel(resolveRecipientName(delivery, userNameById)),
      isDeactivated: !activeUserIds.has(delivery.userId),
      deliveries: [delivery],
    })
  }

  return groups
}

function ChannelIcons({ channels }: { channels: ReminderChannel[] }) {
  const uniqueChannels = [...new Set(channels)]
  if (uniqueChannels.length <= 1) return null

  return (
    <span className="inline-flex shrink-0 items-center gap-0.5 text-muted-foreground/70">
      {uniqueChannels.map(channel => {
        const config = CHANNEL_CONFIG[channel]
        const Icon = config.icon
        return (
          <Tooltip key={channel}>
            <TooltipTrigger asChild>
              <span className="inline-flex">
                <Icon className="size-3" aria-hidden />
              </span>
            </TooltipTrigger>
            <TooltipContent>{config.label}</TooltipContent>
          </Tooltip>
        )
      })}
    </span>
  )
}

function DeliveryRow({
  alert,
  showActionColumn,
}: {
  alert: AlertDelivery
  showActionColumn: boolean
}) {
  const isInvestment = alert.sourceType === 'investment'
  const payload = alert.payload
  const sentAt = getSentAt(alert)
  const channels = alert.channels ?? [alert.channel]

  return (
    <TableRow>
      <TableCell className="max-w-[240px]">
        <div className="min-w-0 space-y-0.5">
          <div className="flex min-w-0 items-center gap-2">
            {isInvestment ? (
              <BriefcaseBusiness className="h-4 w-4 shrink-0 text-muted-foreground" />
            ) : (
              <Bell className={`h-4 w-4 shrink-0 ${getAlertKindIconClass(alert.kind)}`} />
            )}
            <span className="truncate font-medium">{getAlertTitle(alert)}</span>
            <ChannelIcons channels={channels} />
          </div>
          <p className="text-xs text-muted-foreground sm:hidden">{formatDate(sentAt)}</p>
        </div>
      </TableCell>
      <TableCell className="hidden sm:table-cell whitespace-nowrap text-muted-foreground">
        {formatDate(sentAt)}
      </TableCell>
      <TableCell className="whitespace-nowrap">
        <Badge variant={getAlertKindBadgeVariant(alert.kind)} className="font-normal">
          {formatKindLabel(alert.kind)}
        </Badge>
      </TableCell>
      {showActionColumn ? (
        <TableCell className="text-right whitespace-nowrap">
          {isInvestment ? (
            <Button size="sm" variant="ghost" className="h-8 px-2" asChild>
              <Link
                to="/investments"
                search={{
                  action: 'register',
                  assetId: String(payload.assetId ?? ''),
                  planId: String(payload.planId ?? ''),
                  referenceMonth: String(payload.referenceMonth ?? ''),
                }}
              >
                Registrar
              </Link>
            </Button>
          ) : null}
        </TableCell>
      ) : null}
    </TableRow>
  )
}

function UserGroupHeader({
  name,
  count,
  isDeactivated,
  columnCount,
}: {
  name: string
  count: number
  isDeactivated: boolean
  columnCount: number
}) {
  return (
    <TableRow className="bg-muted/30 hover:bg-muted/30">
      <TableCell colSpan={columnCount} className="py-2">
        <span className="text-xs font-medium text-muted-foreground">
          {name}
          {isDeactivated ? (
            <span className="font-normal text-muted-foreground/80"> · desativado</span>
          ) : null}{' '}
          <span className="font-normal">({count})</span>
        </span>
      </TableCell>
    </TableRow>
  )
}

export function RecentDeliveriesCard({ slug }: RecentDeliveriesCardProps) {
  const { data, isLoading, error, refetch } = useRecentDeliveries(slug)
  const { data: usersData } = useListUsersByOrg(slug)

  if (isLoading || error) {
    return <LoadingErrorState isLoading={isLoading} error={error} onRetry={refetch} />
  }

  const orgUsers = usersData?.users ?? []
  const activeUserIds = new Set(orgUsers.map(user => user.id))
  const userNameById = new Map(orgUsers.map(user => [user.id, user.name]))
  const recentDeliveries = data?.alerts ?? []
  const deliveryGroups = groupDeliveriesByUser(recentDeliveries, userNameById, activeUserIds)
  const showActionColumn = recentDeliveries.some(delivery => delivery.sourceType === 'investment')
  const columnCount = showActionColumn ? 4 : 3
  const showUserGroups = deliveryGroups.length > 1

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Últimos envios</CardTitle>
        <CardDescription>Alertas enviados nas últimas 24 horas.</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {recentDeliveries.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-muted-foreground">
            Nenhum envio recente
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Título</TableHead>
                <TableHead className="hidden sm:table-cell whitespace-nowrap">Enviado</TableHead>
                <TableHead className="whitespace-nowrap">Tipo</TableHead>
                {showActionColumn ? (
                  <TableHead className="w-[88px] text-right">Ação</TableHead>
                ) : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {deliveryGroups.map(group => (
                <Fragment key={group.userId}>
                  {showUserGroups ? (
                    <UserGroupHeader
                      name={group.recipientName}
                      count={group.deliveries.length}
                      isDeactivated={group.isDeactivated}
                      columnCount={columnCount}
                    />
                  ) : null}
                  {group.deliveries.map(alert => (
                    <DeliveryRow
                      key={alert.id}
                      alert={alert}
                      showActionColumn={showActionColumn}
                    />
                  ))}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
