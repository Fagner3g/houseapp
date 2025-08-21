import { Pie, PieChart, Cell } from 'recharts'

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type { ListTransactions200TransactionsItem } from '@/api/generated/model'

interface Props {
  transaction: ListTransactions200TransactionsItem | null
}

export function TransactionSummary({ transaction }: Props) {
  if (!transaction) return null

  const total = transaction.installmentsTotal ?? 0
  const paid = transaction.installmentsPaid ?? 0
  const remaining = Math.max(total - paid, 0)

  const chartData = [
    { key: 'paid', value: paid },
    { key: 'remaining', value: remaining },
  ]

  const chartConfig = {
    paid: {
      label: 'Pagas',
      color: 'hsl(142.1 70.6% 45.3%)',
    },
    remaining: {
      label: 'Pendentes',
      color: 'hsl(0 84.2% 60.2%)',
    },
  } satisfies ChartConfig

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Informações gerais</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid grid-cols-3 text-center gap-2">
          <div>
            <p className="text-sm text-muted-foreground">Parcelas</p>
            <p className="font-semibold">{total}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Pagas</p>
            <p className="font-semibold">{paid}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Faltantes</p>
            <p className="font-semibold">{remaining}</p>
          </div>
        </div>
        <ChartContainer config={chartConfig} className="h-[120px] w-full">
          <PieChart>
            <Pie data={chartData} dataKey="value" nameKey="key" innerRadius={30} strokeWidth={5}>
              {chartData.map(item => (
                <Cell key={item.key} fill={`var(--color-${item.key})`} />
              ))}
            </Pie>
            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
