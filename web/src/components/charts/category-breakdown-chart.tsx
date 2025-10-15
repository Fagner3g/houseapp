import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

interface CategoryBreakdown {
  category: string
  count: number
  totalAmount: number
  color?: string
}

interface CategoryBreakdownChartProps {
  data: CategoryBreakdown[]
}

const FALLBACK_COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#84cc16', // lime
  '#f97316', // orange
]

export function CategoryBreakdownChart({ data }: CategoryBreakdownChartProps) {
  const formatCurrency = (value: number) => {
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
  }

  if (data.length === 0) {
    return (
      <div className="flex h-80 w-full items-center justify-center">
        <p className="text-muted-foreground">Nenhuma categoria encontrada</p>
      </div>
    )
  }

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ category, percent }) => `${category} (${(percent * 100).toFixed(0)}%)`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="totalAmount"
          >
            {data.map((entry, idx) => (
              <Cell
                key={`cell-${entry.category}`}
                fill={entry.color || FALLBACK_COLORS[idx % FALLBACK_COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload as CategoryBreakdown
                return (
                  <div className="rounded-lg border bg-background p-3 shadow-md">
                    <p className="font-medium">{data.category}</p>
                    <div className="space-y-1">
                      <p className="text-sm">Quantidade: {data.count}</p>
                      <p className="text-sm">Valor: {formatCurrency(data.totalAmount)}</p>
                    </div>
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
