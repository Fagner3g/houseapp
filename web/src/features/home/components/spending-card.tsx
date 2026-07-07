import type { GetReportByCategory200CategoriesItem } from '@/api/generated/model'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCentsString } from '@/lib/currency'

interface SpendingCardProps {
  categories: GetReportByCategory200CategoriesItem[]
}

export function SpendingCard({ categories }: SpendingCardProps) {
  const top = categories.slice(0, 5)
  const max = top.reduce((acc, c) => Math.max(acc, Number(c.total)), 0)

  if (!top.length) return null

  return (
    <Card className="finance-card">
      <CardHeader>
        <CardTitle className="text-base">Gastos do mês</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {top.map(cat => {
          const pct = max > 0 ? (Number(cat.total) / max) * 100 : 0
          return (
            <div key={cat.categoryId}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="font-medium text-slate-700">{cat.name}</span>
                <span className="tabular-nums text-slate-600">
                  {formatCentsString(cat.total)} ({cat.percentage}%)
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-rose-400"
                  style={{ width: `${pct}%`, backgroundColor: cat.color ?? undefined }}
                />
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
