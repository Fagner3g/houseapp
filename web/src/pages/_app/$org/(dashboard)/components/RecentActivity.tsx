import dayjs from 'dayjs'
import { DollarSign } from 'lucide-react'

import type { GetOrgSlugReportsTransactions200ReportsRecentActivityItem } from '@/api/generated/model'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type Props = {
  items: GetOrgSlugReportsTransactions200ReportsRecentActivityItem[]
}

export function RecentActivity({ items }: Props) {
  return (
    <div className="px-4 lg:px-6">
      <Card>
        <CardHeader>
          <CardTitle>Atividade Recente</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length > 0 ? (
            <div className="space-y-3">
              {items.map(activity => (
                <div
                  key={activity.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="font-medium">
                      {activity.title}{' '}
                      <span className="text-xs text-muted-foreground">
                        • {activity.status === 'paid' ? 'Pago' : 'Pendente'}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Vencimento: {dayjs(activity.dueDate).format('DD/MM/YYYY')} • Atualizado em:{' '}
                      {dayjs(activity.updatedAt).format('DD/MM/YYYY HH:mm')}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-4 w-4" />
                    <span className="font-medium">
                      R$ {activity.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhuma atividade recente</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
