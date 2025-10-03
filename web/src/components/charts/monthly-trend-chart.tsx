import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

interface MonthlyTrend {
  month: string
  total: number
  paid: number
  pending: number
}

interface MonthlyTrendChartProps {
  data: MonthlyTrend[]
}

export function MonthlyTrendChart({ data }: MonthlyTrendChartProps) {
  const formatCurrency = (value: number) => {
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
  }

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="month"
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
                    <p className="font-medium">{label}</p>
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
          <Bar dataKey="paid" fill="#10b981" radius={[2, 2, 0, 0]} />
          <Bar dataKey="pending" fill="#f59e0b" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
