import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCentsString } from '@/lib/currency'

interface TotalSpentCardProps {
  totalExpense: string
}

export function TotalSpentCard({ totalExpense }: TotalSpentCardProps) {
  return (
    <Card className="finance-card border-slate-200 bg-gradient-to-br from-white to-rose-50/40">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-slate-500">Gasto total do mês</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold tabular-nums tracking-tight text-slate-900 md:text-4xl">
          {formatCentsString(totalExpense)}
        </p>
        <p className="mt-2 text-sm text-slate-500">Despesas pagas no período</p>
      </CardContent>
    </Card>
  )
}
