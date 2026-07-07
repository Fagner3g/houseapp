import type { GetReportByCard200TransactionsItem } from '@/api/generated/model'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCentsString } from '@/lib/currency'
import dayjs from 'dayjs'

interface CardSpendingCardProps {
  transactions: GetReportByCard200TransactionsItem[]
  grandTotal: string
  myGrandTotal?: string
}

function formatCardLabel(tx: GetReportByCard200TransactionsItem) {
  if (tx.cardLabel) {
    const suffix = tx.lastFourDigits ? ` · ${tx.lastFourDigits}` : ''
    return `${tx.cardLabel}${suffix}`
  }
  return tx.accountName
}

export function CardSpendingCard({
  transactions,
  grandTotal,
  myGrandTotal,
}: CardSpendingCardProps) {
  const displayGrandTotal = myGrandTotal ?? grandTotal
  const max = transactions.reduce(
    (acc, tx) => Math.max(acc, Number(tx.myAmount ?? tx.amount)),
    0
  )

  return (
    <Card className="finance-card">
      <CardHeader>
        <CardTitle className="text-base">Maiores gastos no cartão</CardTitle>
        <p className="text-sm text-slate-500">
          {formatCentsString(displayGrandTotal)} meu gasto
          {myGrandTotal && myGrandTotal !== grandTotal ? (
            <span className="text-slate-400"> · {formatCentsString(grandTotal)} bruto</span>
          ) : null}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {!transactions.length ? (
          <p className="text-sm text-slate-500">Nenhum gasto em cartão neste período</p>
        ) : (
          transactions.map(tx => {
            const netAmount = tx.myAmount ?? tx.amount
            const myTotal = Number(myGrandTotal ?? grandTotal)
            const barPct = max > 0 ? (Number(netAmount) / max) * 100 : 0
            const sharePct =
              myTotal > 0 ? ((Number(netAmount) / myTotal) * 100).toFixed(0) : '0'
            const grossNote =
              tx.myAmount && tx.myAmount !== tx.amount
                ? ` · ${formatCentsString(tx.amount)} bruto`
                : ''
            const purchaseLabel = dayjs(tx.purchaseDate).format('DD/MM')

            return (
              <div key={tx.transactionId}>
                <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                  <span className="min-w-0 truncate font-medium text-slate-700">{tx.title}</span>
                  <span className="shrink-0 tabular-nums text-slate-600">
                    {formatCentsString(netAmount)} ({sharePct}%){grossNote}
                  </span>
                </div>
                <p className="mb-1 text-xs text-slate-400">
                  {formatCardLabel(tx)} · {purchaseLabel}
                </p>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-violet-400" style={{ width: `${barPct}%` }} />
                </div>
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}
