import type { GetReportByAccount200 } from '@/api/generated/model'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCentsString } from '@/lib/currency'

interface AccountBalancesCardProps {
  data?: GetReportByAccount200
  isLoading?: boolean
  error?: unknown
}

export function AccountBalancesCard({ data, isLoading, error }: AccountBalancesCardProps) {
  const accounts = data?.accounts ?? []

  return (
    <Card className="finance-card">
      <CardHeader>
        <CardTitle className="text-base">Saldo por conta</CardTitle>
        <p className="text-sm text-slate-500">Saldo atual (hoje)</p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-12 animate-pulse rounded-lg bg-slate-100" />
            ))}
          </div>
        ) : error ? (
          <p className="text-sm text-slate-500">Não foi possível carregar os saldos</p>
        ) : accounts.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhuma conta cadastrada</p>
        ) : (
          <div className="space-y-2">
            {accounts.slice(0, 5).map(account => (
              <div
                key={account.accountId}
                className="flex items-center justify-between rounded-lg border border-slate-100 p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-700">{account.name}</p>
                  <p className="text-xs text-slate-400">
                    {formatCentsString(account.income)} receitas ·{' '}
                    {formatCentsString(account.expense)} despesas no período
                  </p>
                </div>
                <span className="ml-2 shrink-0 text-sm tabular-nums text-slate-900">
                  {formatCentsString(account.balance)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
