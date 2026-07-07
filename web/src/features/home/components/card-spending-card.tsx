import type { GetReportByCard200CardsItem } from '@/api/generated/model'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCentsString } from '@/lib/currency'

interface CardSpendingCardProps {
  cards: GetReportByCard200CardsItem[]
  grandTotal: string
  myGrandTotal?: string
}

export function CardSpendingCard({ cards, grandTotal, myGrandTotal }: CardSpendingCardProps) {
  const top = cards.slice(0, 5)
  const max = top.reduce((acc, c) => Math.max(acc, Number(c.myTotal ?? c.total)), 0)
  const displayGrandTotal = myGrandTotal ?? grandTotal

  return (
    <Card className="finance-card">
      <CardHeader>
        <CardTitle className="text-base">Gastos por cartão</CardTitle>
        <p className="text-sm text-slate-500">
          {formatCentsString(displayGrandTotal)} meu gasto
          {myGrandTotal && myGrandTotal !== grandTotal ? (
            <span className="text-slate-400"> · {formatCentsString(grandTotal)} bruto</span>
          ) : null}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {!top.length ? (
          <p className="text-sm text-slate-500">Nenhum gasto em cartão neste período</p>
        ) : (
          top.map(card => {
          const netTotal = card.myTotal ?? card.total
          const pct = max > 0 ? (Number(netTotal) / max) * 100 : 0
          const suffix = card.lastFourDigits ? ` · ${card.lastFourDigits}` : ''
          const grossNote =
            card.myTotal && card.myTotal !== card.total
              ? ` · ${formatCentsString(card.total)} bruto`
              : ''
          return (
            <div key={card.cardId}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="font-medium text-slate-700">
                  {card.label}
                  <span className="font-normal text-slate-500">{suffix}</span>
                </span>
                <span className="tabular-nums text-slate-600">
                  {formatCentsString(netTotal)} ({card.percentage}%){grossNote}
                </span>
              </div>
              <p className="mb-1 text-xs text-slate-400">{card.accountName}</p>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-violet-400" style={{ width: `${pct}%` }} />
              </div>
            </div>
          )
        })
        )}
      </CardContent>
    </Card>
  )
}
