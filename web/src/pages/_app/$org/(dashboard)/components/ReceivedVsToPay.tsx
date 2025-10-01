import { DollarSign } from 'lucide-react'

import type { GetOrgSlugReportsTransactions200ReportsKpis } from '@/api/generated/model'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type Props = { kpis?: GetOrgSlugReportsTransactions200ReportsKpis }

export function ReceivedVsToPay({ kpis }: Props) {
  const received = kpis?.receivedTotal ?? 0
  const toSpend = kpis?.toSpendTotal ?? 0
  const total = received + toSpend
  const receivedPct = total > 0 ? Math.round((received / total) * 100) : 0
  const toSpendPct = total > 0 ? Math.round((toSpend / total) * 100) : 0

  return (
    <div className="px-4 lg:px-6">
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" /> Recebido x A pagar (mês)
            </CardTitle>
            <CardDescription>Resumo do mês atual</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Recebido: R$ {received.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-sm text-muted-foreground">
                  A pagar: R$ {toSpend.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="col-span-2">
                <div className="h-3 w-full rounded-full bg-muted">
                  <div
                    className="h-3 rounded-full bg-green-500 transition-all"
                    style={{ width: `${receivedPct}%` }}
                  />
                </div>
                <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                  <span>{receivedPct}% recebido</span>
                  <span>{toSpendPct}% a pagar</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
