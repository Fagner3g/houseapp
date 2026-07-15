import type { CategoricalChartState } from 'recharts/types/chart/types'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

interface MonthlyTrend {
  month: string
  monthKey: string
  income: number
  expense: number
}

interface MonthlyTrendChartProps {
  data: MonthlyTrend[]
  selectedMonthKey?: string
  onMonthSelect?: (monthKey: string) => void
}

export function MonthlyTrendChart({ data, selectedMonthKey, onMonthSelect }: MonthlyTrendChartProps) {
  const formatCurrency = (value: number) => {
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
  }

  const handleChartClick = (state: CategoricalChartState) => {
    const monthKey = state?.activePayload?.[0]?.payload?.monthKey
    if (typeof monthKey === 'string' && onMonthSelect) {
      onMonthSelect(monthKey)
    }
  }

  return (
    <div className={`h-80 w-full ${onMonthSelect ? 'cursor-pointer' : ''}`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          onClick={onMonthSelect ? handleChartClick : undefined}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="month"
            className="text-xs fill-muted-foreground"
            tickLine={false}
            axisLine={false}
            tick={({ x, y, payload }) => {
              const entry = data.find(d => d.month === payload.value)
              const isSelected = entry?.monthKey === selectedMonthKey
              return (
                // SVG tick labels: role="button" is not recognized for <text> by a11y lint.
                // biome-ignore lint/a11y/noStaticElementInteractions: chart month tick click target
                <text
                  x={x}
                  y={y}
                  dy={16}
                  textAnchor="middle"
                  className={`text-xs ${isSelected ? 'fill-slate-900 font-semibold' : 'fill-muted-foreground'} ${onMonthSelect ? 'cursor-pointer' : ''}`}
                  onClick={() => entry && onMonthSelect?.(entry.monthKey)}
                >
                  {payload.value}
                </text>
              )
            }}
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
                        <div className="h-2 w-2 rounded-full bg-emerald-500" />
                        <span className="text-sm">
                          Receitas: {formatCurrency(payload[0]?.value as number)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-rose-400" />
                        <span className="text-sm">
                          Meu gasto: {formatCurrency(payload[1]?.value as number)}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              }
              return null
            }}
          />
          <Bar dataKey="income" fill="#10b981" radius={[2, 2, 0, 0]}>
            {data.map(entry => (
              <Cell
                key={`income-${entry.monthKey}`}
                fill={entry.monthKey === selectedMonthKey ? '#059669' : '#10b981'}
              />
            ))}
          </Bar>
          <Bar dataKey="expense" fill="#fb7185" radius={[2, 2, 0, 0]}>
            {data.map(entry => (
              <Cell
                key={`expense-${entry.monthKey}`}
                fill={entry.monthKey === selectedMonthKey ? '#f43f5e' : '#fb7185'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
