import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useId } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

interface DailyTransaction {
  date: string
  paid: number
  pending: number
  total: number
}

interface DailyTransactionsChartProps {
  data: DailyTransaction[]
}

export function DailyTransactionsChart({ data }: DailyTransactionsChartProps) {
  const paidGradientId = useId()
  const pendingGradientId = useId()

  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), 'dd/MM', { locale: ptBR })
  }

  const formatCurrency = (value: number) => {
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
  }

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={paidGradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
            </linearGradient>
            <linearGradient id={pendingGradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            className="text-xs fill-muted-foreground"
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tickFormatter={formatCurrency}
            className="text-xs fill-muted-foreground"
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="rounded-lg border bg-background p-3 shadow-md">
                    <p className="font-medium">{formatDate(label)}</p>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-green-500" />
                        <span className="text-sm">
                          Pago: {formatCurrency(payload[0]?.value as number)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-yellow-500" />
                        <span className="text-sm">
                          Pendente: {formatCurrency(payload[1]?.value as number)}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              }
              return null
            }}
          />
          <Area
            type="monotone"
            dataKey="paid"
            stackId="1"
            stroke="#10b981"
            fill={`url(#${paidGradientId})`}
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="pending"
            stackId="1"
            stroke="#f59e0b"
            fill={`url(#${pendingGradientId})`}
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
