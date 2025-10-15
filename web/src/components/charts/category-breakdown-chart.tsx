import React from 'react'
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

const RADIAN = Math.PI / 180

interface LabelProps {
  cx: number
  cy: number
  midAngle: number
  outerRadius: number
  percent: number
}

const renderCustomizedLabel = ({ cx, cy, midAngle, outerRadius, percent }: LabelProps) => {
  // Só exibir se a porcentagem for maior que 3% para evitar sobreposição
  if (percent < 0.03) return null

  // Posicionar o label mais próximo do gráfico, na borda
  const radius = outerRadius * 0.7
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      className="text-xs font-bold"
      style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

export function CategoryBreakdownChart({ data }: CategoryBreakdownChartProps) {
  const [activeIndex, setActiveIndex] = React.useState<number | null>(null)

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

  const handleLegendClick = (index: number) => {
    setActiveIndex(activeIndex === index ? null : index)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomizedLabel}
              outerRadius={90}
              fill="#8884d8"
              dataKey="totalAmount"
              nameKey="category"
              stroke="transparent"
              strokeWidth={0}
            >
              {data.map((entry, idx) => (
                <Cell
                  key={`cell-${entry.category}`}
                  fill={entry.color || FALLBACK_COLORS[idx % FALLBACK_COLORS.length]}
                  stroke="transparent"
                  strokeWidth={0}
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

      {/* Legenda customizada com wrap e tooltip */}
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-2">
        {data.map((entry, index) => {
          const color = entry.color || FALLBACK_COLORS[index % FALLBACK_COLORS.length]
          const isActive = activeIndex === index

          return (
            <button
              type="button"
              key={`legend-${entry.category}`}
              className="group relative cursor-pointer"
              onMouseEnter={() => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
              onClick={() => handleLegendClick(index)}
            >
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: color }} />
                <span className="text-sm text-muted-foreground">{entry.category}</span>
              </div>

              {/* Tooltip ao hover/click na legenda */}
              {isActive && (
                <div className="absolute bottom-full left-1/2 z-10 mb-2 w-48 -translate-x-1/2 rounded-lg border bg-background p-3 shadow-md">
                  <p className="font-medium">{entry.category}</p>
                  <div className="space-y-1">
                    <p className="text-sm">Quantidade: {entry.count}</p>
                    <p className="text-sm">Valor: {formatCurrency(entry.totalAmount)}</p>
                  </div>
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
