import { Calendar, Clock, DollarSign, User } from 'lucide-react'

import type {
  GetOrgSlugReportsTransactions200ReportsUpcomingAlerts,
  ListTransactions200TransactionsItem,
} from '@/api/generated/model'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { mapUpcomingAlertToListItem } from '../../../../../components/drawer-transaction/row-mapper'
import { DashboardTransactionItem } from './DashboardTransactionItem'

type Props = {
  upcoming: GetOrgSlugReportsTransactions200ReportsUpcomingAlerts
  onEdit: (t: ListTransactions200TransactionsItem) => void
}

export function UpcomingAlerts({ upcoming, onEdit }: Props) {
  return (
    <div className="px-4 lg:px-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Alertas Próximos
          </CardTitle>
          <CardDescription>Transações que vencem nos próximos 4 dias</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{upcoming.summary.today}</div>
              <p className="text-sm text-muted-foreground">Hoje</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{upcoming.summary.tomorrow}</div>
              <p className="text-sm text-muted-foreground">Amanhã</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{upcoming.summary.twoDays}</div>
              <p className="text-sm text-muted-foreground">Em 2 dias</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {upcoming.summary.threeToFourDays}
              </div>
              <p className="text-sm text-muted-foreground">Em 3-4 dias</p>
            </div>
          </div>

          {upcoming.transactions.length > 0 ? (
            <div className="space-y-3">
              {upcoming.transactions.map(transaction => {
                const normalized: ListTransactions200TransactionsItem =
                  mapUpcomingAlertToListItem(transaction)
                return (
                  <DashboardTransactionItem
                    key={transaction.id}
                    transaction={normalized}
                    onEdit={onEdit}
                    variant="upcoming"
                    leftIcon={<Calendar className="h-4 w-4 text-blue-500" />}
                    title={transaction.title}
                    ownerName={transaction.ownerName}
                    amount={transaction.amount}
                    rightIcon={<Clock className="h-3 w-3 text-blue-500" />}
                    rightPrimaryText={
                      transaction.daysUntilDue === 0
                        ? 'Vence hoje'
                        : `Em ${transaction.daysUntilDue} dia${transaction.daysUntilDue > 1 ? 's' : ''}`
                    }
                    rightSecondaryText={`Vencimento: ${new Date(transaction.dueDate).toLocaleDateString('pt-BR')}`}
                  />
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum alerta próximo</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
