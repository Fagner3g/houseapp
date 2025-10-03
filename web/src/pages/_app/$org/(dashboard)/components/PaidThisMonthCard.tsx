import { DollarSign, User } from 'lucide-react'

import type {
  GetOrgSlugReportsTransactions200ReportsPaidThisMonth,
  ListTransactions200TransactionsItem,
} from '@/api/generated/model'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { mapPaidThisMonthToListItem } from '../../../../../components/drawer-transaction/row-mapper'

type Props = {
  data?: GetOrgSlugReportsTransactions200ReportsPaidThisMonth
  onEdit: (t: ListTransactions200TransactionsItem) => void
}

export function PaidThisMonthCard({ data, onEdit }: Props) {
  if (!data) return null

  return (
    <div className="px-4 lg:px-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Pagas neste mês
          </CardTitle>
          <CardDescription>
            {data.summary?.total || 0} transações • R${' '}
            {(data.summary?.totalAmount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {(data.transactions || []).length > 0 ? (
            <div className="space-y-3">
              {data.transactions.map(transaction => (
                <button
                  key={transaction.id}
                  type="button"
                  className="flex items-center justify-between p-4 border rounded-lg transition-all duration-200 hover:bg-muted/50 w-full text-left"
                  onClick={() => onEdit(mapPaidThisMonthToListItem(transaction))}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <DollarSign className="h-4 w-4 text-emerald-500" />
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
                    <div className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                      Pago em{' '}
                      {new Date(transaction.paidAt ?? transaction.dueDate).toLocaleDateString(
                        'pt-BR'
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Vencimento {new Date(transaction.dueDate).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma transação paga neste mês
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
