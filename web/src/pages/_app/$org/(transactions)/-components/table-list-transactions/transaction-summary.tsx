import { Cell, Pie, PieChart } from 'recharts'

import type { ListTransactions200TransactionsItem } from '@/api/generated/model'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'

// Função utilitária para calcular informações de parcelas
function calculateInstallmentsInfo(
  installmentsTotal: number | null | undefined,
  installmentsPaid: number | null | undefined,
  status: 'paid' | 'pending' | 'canceled'
) {
  // Se installmentsTotal é null/undefined, é uma transação única
  const isRecurring = installmentsTotal !== null && installmentsTotal !== undefined

  if (!isRecurring) {
    // Transação única: sempre 1 parcela
    const paid = status === 'paid' ? 1 : 0
    return {
      total: 1,
      paid,
      remaining: 1 - paid,
      isRecurring: false,
    }
  }

  // Transação recorrente: usar valores do banco
  const total = installmentsTotal ?? 0
  const paid = installmentsPaid ?? 0
  const remaining = Math.max(0, total - paid)

  return {
    total,
    paid,
    remaining,
    isRecurring: true,
  }
}

interface Props {
  transaction: ListTransactions200TransactionsItem | null
}

export function TransactionSummary({ transaction }: Props) {
  if (!transaction) return null

  // Calcular informações de parcelas usando a função utilitária
  const installmentsInfo = calculateInstallmentsInfo(
    transaction.installmentsTotal,
    transaction.installmentsPaid,
    transaction.status
  )

  const chartData = [
    { key: 'paid', value: installmentsInfo.paid },
    { key: 'remaining', value: installmentsInfo.remaining },
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
            <p className="font-semibold">{installmentsInfo.total}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Pagas</p>
            <p className="font-semibold">{installmentsInfo.paid}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Faltantes</p>
            <p className="font-semibold">{installmentsInfo.remaining}</p>
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
