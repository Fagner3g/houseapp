import { AlertTriangle, Clock, DollarSign, User } from 'lucide-react'

import type {
  GetOrgSlugReportsTransactions200ReportsOverdueTransactions,
  ListTransactions200TransactionsItem,
} from '@/api/generated/model'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { mapOverdueToListItem } from '../../../../../components/drawer-transaction/row-mapper'

type Props = {
  data?: GetOrgSlugReportsTransactions200ReportsOverdueTransactions
  onEdit: (t: ListTransactions200TransactionsItem) => void
}

export function OverdueTransactionsCard({ data, onEdit }: Props) {
  if (!data || (data.transactions || []).length === 0) return null

  return (
    <div className="px-4 lg:px-6">
      <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-300">
            <AlertTriangle className="h-5 w-5" />
            Transações Vencidas
          </CardTitle>
          <CardDescription className="text-red-600 dark:text-red-400">
            {data.summary?.total || 0} transação(ões) vencida(s) requerem atenção
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.transactions.map(transaction => (
              <button
                key={transaction.id}
                type="button"
                className="flex items-center justify-between p-4 border rounded-lg transition-all duration-200 hover:bg-red-100/30 w-full text-left"
                onClick={() => onEdit(mapOverdueToListItem(transaction))}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <h4 className="font-medium text-foreground">{transaction.title}</h4>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      <span>{transaction.ownerName}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      <span className="font-medium">
                        R${' '}
                        {Number(transaction.amount).toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 justify-end mb-1">
                    <Clock className="h-3 w-3 text-red-500" />
                    <span className="text-sm font-medium text-red-600 dark:text-red-400">
                      {transaction.overdueDays === 1
                        ? '1 dia vencido'
                        : `${transaction.overdueDays} dias vencidos`}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Venceu em {new Date(transaction.dueDate).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
