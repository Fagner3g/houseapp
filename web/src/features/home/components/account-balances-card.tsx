import { Wallet } from 'lucide-react'

import type { GetReportByAccount200 } from '@/api/generated/model'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, reaisToCents } from '@/lib/currency'
import { cn } from '@/lib/utils'

import { accountBalanceBridge, formatSignedCurrency } from '../lib/account-balance-bridge'

interface AccountBalancesCardProps {
  data?: GetReportByAccount200
  netWorth?: string
  isLoading?: boolean
  error?: unknown
}

function periodClass(periodNet: number) {
  const cents = reaisToCents(periodNet)
  if (cents === 0) return 'text-slate-400'
  return cents > 0 ? 'text-emerald-600' : 'text-rose-600'
}

export function AccountBalancesCard({
  data,
  netWorth,
  isLoading,
  error,
}: AccountBalancesCardProps) {
  const accounts = (data?.accounts ?? []).filter(account => account.type !== 'credit_card')

  return (
    <Card className="finance-card">
      <CardHeader className="flex flex-row items-center gap-2 space-y-0">
        <Wallet className="size-4 text-slate-500" />
        <div className="min-w-0">
          <CardTitle className="text-base">Saldo por conta</CardTitle>
          <p className="text-sm text-slate-500">Início + mês = agora</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {netWorth ? (
          <p className="text-2xl font-bold tabular-nums tracking-tight text-slate-900">
            {netWorth}
          </p>
        ) : null}

        {isLoading ? (
          <div className="space-y-2">
            {['skeleton-a', 'skeleton-b'].map(key => (
              <div key={key} className="h-16 animate-pulse rounded-lg bg-slate-100" />
            ))}
          </div>
        ) : error ? (
          <p className="text-sm text-slate-500">Não foi possível carregar os saldos</p>
        ) : accounts.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhuma conta cadastrada</p>
        ) : (
          <div className="space-y-2">
            {accounts.slice(0, 5).map(account => {
              const bridge = accountBalanceBridge(account)
              return (
                <div
                  key={account.accountId}
                  className="rounded-lg border border-slate-100 px-3 py-2.5"
                >
                  <p className="truncate text-sm font-medium text-slate-700">{account.name}</p>
                  <div className="mt-1.5 grid grid-cols-[1fr_auto_1fr_auto_1fr] items-end gap-x-1.5">
                    <div className="min-w-0 text-left">
                      <p className="truncate text-xs tabular-nums text-slate-500">
                        {formatCurrency(bridge.beforePeriod)}
                      </p>
                      <p className="text-[10px] text-slate-400">início</p>
                    </div>
                    <span className="pb-3.5 text-slate-300" aria-hidden>
                      →
                    </span>
                    <div className="min-w-0 text-center">
                      <p
                        className={cn(
                          'truncate text-xs font-medium tabular-nums',
                          periodClass(bridge.periodNet)
                        )}
                      >
                        {formatSignedCurrency(bridge.periodNet, formatCurrency)}
                      </p>
                      <p className="text-[10px] text-slate-400">mês</p>
                    </div>
                    <span className="pb-3.5 text-slate-300" aria-hidden>
                      →
                    </span>
                    <div className="min-w-0 text-right">
                      <p className="truncate text-xs font-semibold tabular-nums text-slate-900">
                        {formatCurrency(bridge.balance)}
                      </p>
                      <p className="text-[10px] text-slate-400">agora</p>
                    </div>
                  </div>
                  {reaisToCents(bridge.periodNet) !== 0 ? (
                    <p className="mt-1.5 text-[10px] text-slate-400">
                      Mês: {formatCurrency(bridge.income)} receitas −{' '}
                      {formatCurrency(bridge.expense)} despesas
                    </p>
                  ) : null}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
