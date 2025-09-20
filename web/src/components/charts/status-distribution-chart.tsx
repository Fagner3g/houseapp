import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

interface StatusDistribution {
  paid: number
  pending: number
  overdue: number
}

interface StatusDistributionChartProps {
  data: StatusDistribution
}

const STATUS_COLORS = {
  paid: '#10b981', // emerald
  pending: '#f59e0b', // amber
  overdue: '#ef4444', // red
}

const STATUS_LABELS = {
  paid: 'Pago',
  pending: 'Pendente',
  overdue: 'Vencido',
}

export function StatusDistributionChart({ data }: StatusDistributionChartProps) {
  const chartData = [
    { name: 'paid', value: data.paid, label: STATUS_LABELS.paid },
    { name: 'pending', value: data.pending, label: STATUS_LABELS.pending },
    { name: 'overdue', value: data.overdue, label: STATUS_LABELS.overdue },
  ].filter(item => item.value > 0)

  if (chartData.length === 0) {
    return (
      <div className="flex h-80 w-full items-center justify-center">
        <p className="text-muted-foreground">Nenhum dado disponível</p>
      </div>
    )
  }

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ label, percent }) => `${label} (${(percent * 100).toFixed(0)}%)`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map(entry => (
              <Cell
                key={`cell-${entry.name}`}
                fill={STATUS_COLORS[entry.name as keyof typeof STATUS_COLORS]}
              />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload
                return (
                  <div className="rounded-lg border bg-background p-3 shadow-md">
                    <p className="font-medium">{data.label}</p>
                    <p className="text-sm">Quantidade: {data.value}</p>
                  </div>
                )
              }
              return null
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
