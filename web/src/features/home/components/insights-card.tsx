import type { GetReportInsights200InsightsItem } from '@/api/generated/model'
import { Lightbulb, Loader2, Sparkles, TrendingDown, TrendingUp } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface InsightsCardProps {
  insights?: GetReportInsights200InsightsItem[]
  source?: 'ai' | 'fallback'
  isLoading?: boolean
  error?: unknown
}

const typeConfig = {
  warning: {
    icon: TrendingDown,
    className: 'border-amber-200 bg-amber-50/60',
    iconClass: 'text-amber-600',
  },
  tip: {
    icon: Lightbulb,
    className: 'border-blue-200 bg-blue-50/40',
    iconClass: 'text-blue-600',
  },
  positive: {
    icon: TrendingUp,
    className: 'border-emerald-200 bg-emerald-50/40',
    iconClass: 'text-emerald-600',
  },
} as const

export function InsightsCard({ insights, source, isLoading, error }: InsightsCardProps) {
  return (
    <Card className="finance-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-violet-500" />
          <CardTitle className="text-base">Hábitos para economizar</CardTitle>
        </div>
        {source === 'ai' && !isLoading && (
          <span className="text-xs text-violet-500">Gerado por IA</span>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
            <Loader2 className="size-4 animate-spin" />
            Analisando seus dados...
          </div>
        ) : error ? (
          <p className="py-8 text-center text-sm text-slate-500">
            Não foi possível gerar insights agora.
          </p>
        ) : !insights?.length ? (
          <p className="py-8 text-center text-sm text-slate-500">
            Registre mais lançamentos para receber dicas personalizadas.
          </p>
        ) : (
          <div className="space-y-3">
            {insights.map((insight, index) => {
              const config = typeConfig[insight.type] ?? typeConfig.tip
              const Icon = config.icon

              return (
                <div
                  key={`${insight.title}-${index}`}
                  className={cn('rounded-lg border p-4', config.className)}
                >
                  <div className="mb-1 flex items-center gap-2">
                    <Icon className={cn('size-4', config.iconClass)} />
                    <h4 className="font-medium text-slate-900">{insight.title}</h4>
                  </div>
                  <p className="text-sm leading-relaxed text-slate-600">{insight.body}</p>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
