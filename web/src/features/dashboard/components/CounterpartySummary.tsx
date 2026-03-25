import { User2 } from 'lucide-react'

import type { GetOrgSlugReportsTransactions200ReportsCounterparties } from '@/api/generated/model'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type Props = { data?: GetOrgSlugReportsTransactions200ReportsCounterparties }

function format(amount: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount)
}

export function CounterpartySummary({ data }: Props) {
  if (!data) return null

  const toReceiveSorted = [...data.toReceive].sort((a, b) => b.amount - a.amount)
  const toPaySorted = [...data.toPay].sort((a, b) => b.amount - a.amount)

  return (
    <div className="px-4 lg:px-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User2 className="h-5 w-5" /> Relacionamentos financeiros do mês
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <div className="text-sm font-medium mb-2">Tenho a receber de</div>
              {toReceiveSorted.length === 0 ? (
                <div className="text-sm text-muted-foreground">Sem valores a receber</div>
              ) : (
                <ul className="divide-y rounded-md border max-h-72 overflow-auto">
                  {toReceiveSorted.map(item => {
                    return (
                      <li key={`recv-${item.name}-${item.amount}`} className="p-3">
                        <div className="flex items-center justify-between">
                          <span className="truncate pr-2 font-medium">{item.name}</span>
                          <span className="font-semibold">{format(item.amount)}</span>
                        </div>
                        <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                          {item.items?.map(it => (
                            <li
                              key={`recv-item-${it.title}-${it.amount}`}
                              className="flex items-center justify-between"
                            >
                              <span className="truncate pr-2">• {it.title}</span>
                              <span>{format(it.amount)}</span>
                            </li>
                          ))}
                        </ul>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>

            <div>
              <div className="text-sm font-medium mb-2">Tenho a pagar para</div>
              {toPaySorted.length === 0 ? (
                <div className="text-sm text-muted-foreground">Sem valores a pagar</div>
              ) : (
                <ul className="divide-y rounded-md border max-h-72 overflow-auto">
                  {toPaySorted.map(item => {
                    return (
                      <li key={`pay-${item.name}-${item.amount}`} className="p-3">
                        <div className="flex items-center justify-between">
                          <span className="truncate pr-2 font-medium">{item.name}</span>
                          <span className="font-semibold">{format(item.amount)}</span>
                        </div>
                        <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                          {item.items?.map(it => (
                            <li
                              key={`pay-item-${it.title}-${it.amount}`}
                              className="flex items-center justify-between"
                            >
                              <span className="truncate pr-2">• {it.title}</span>
                              <span>{format(it.amount)}</span>
                            </li>
                          ))}
                        </ul>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
