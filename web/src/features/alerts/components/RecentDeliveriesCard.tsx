import { Link } from '@tanstack/react-router'
import { Bell, BriefcaseBusiness } from 'lucide-react'

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
import { getAlertKindBadgeVariant, getAlertKindIconClass } from '@/lib/alert-status-colors'
import { useRecentDeliveries, type AlertDelivery } from '../api'

type RecentDeliveriesCardProps = {
  slug: string
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

export function RecentDeliveriesCard({ slug }: RecentDeliveriesCardProps) {
  const { data, isLoading, error, refetch } = useRecentDeliveries(slug)

  if (isLoading || error) {
    return <LoadingErrorState isLoading={isLoading} error={error} onRetry={refetch} />
  }

  const recentDeliveries = data?.alerts ?? []

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Últimos envios</CardTitle>
        <CardDescription>Alertas enviados nas últimas 24 horas.</CardDescription>
      </CardHeader>
      <CardContent className="p-0 sm:p-6 sm:pt-0">
        {recentDeliveries.length === 0 ? (
          <p className="px-6 py-4 text-center text-sm text-muted-foreground sm:px-0">
            Nenhum envio recente
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Título</TableHead>
                <TableHead className="hidden sm:table-cell">Enviado</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="w-[100px] text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentDeliveries.map(alert => {
                const isInvestment = alert.sourceType === 'investment'
                const payload = alert.payload
                const sentAt = getSentAt(alert)

                return (
                  <TableRow key={alert.id}>
                    <TableCell>
                      <div className="flex min-w-0 items-center gap-2">
                        {isInvestment ? (
                          <BriefcaseBusiness className="h-4 w-4 shrink-0 text-muted-foreground" />
                        ) : (
                          <Bell className={`h-4 w-4 shrink-0 ${getAlertKindIconClass(alert.kind)}`} />
                        )}
                        <span className="truncate font-medium">{getAlertTitle(alert)}</span>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground sm:hidden">
                        {formatDate(sentAt)}
                      </p>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell whitespace-nowrap text-muted-foreground">
                      {formatDate(sentAt)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getAlertKindBadgeVariant(alert.kind)} className="whitespace-nowrap">
                        {formatKindLabel(alert.kind)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {isInvestment ? (
                        <Button size="sm" variant="ghost" asChild>
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
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
