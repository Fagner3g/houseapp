import { describe, expect, it } from 'vitest'

import {
  buildFallbackInsights,
  parseInsightsJson,
  type DashboardInsightsContext,
} from './dashboard-context'

const baseContext: DashboardInsightsContext = {
  monthLabel: 'julho de 2026',
  income: 5000,
  expense: 3000,
  balance: 2000,
  savingsRate: 40,
  previousIncome: 4500,
  previousExpense: 3200,
  previousBalance: 1300,
  netWorth: 15000,
  overdueCount: 0,
  overdueTotal: 0,
  pendingCount: 2,
  pendingSplitsTotal: 100,
  recurringMonthlyTotal: 500,
  recurringCount: 3,
  categoryChanges: [
    { name: 'Alimentação', current: 1200, previous: 800, changePercent: 50 },
    { name: 'Transporte', current: 400, previous: 350, changePercent: 14 },
  ],
  recentTrends: [],
  topPendingExpenses: [],
}

describe('buildFallbackInsights', () => {
  it('returns positive insight when balance is positive', () => {
    const insights = buildFallbackInsights(baseContext)
    expect(insights.some(i => i.type === 'positive' && i.title.includes('Saldo positivo'))).toBe(
      true
    )
  })

  it('returns warning for negative balance', () => {
    const insights = buildFallbackInsights({ ...baseContext, balance: -500, expense: 5500 })
    expect(insights.some(i => i.type === 'warning' && i.title.includes('negativo'))).toBe(true)
  })

  it('returns warning for overdue transactions', () => {
    const insights = buildFallbackInsights({
      ...baseContext,
      overdueCount: 3,
      overdueTotal: 450,
    })
    expect(insights.some(i => i.title.includes('vencidas'))).toBe(true)
  })

  it('returns tip for rising category', () => {
    const insights = buildFallbackInsights(baseContext)
    expect(insights.some(i => i.title.includes('Alimentação'))).toBe(true)
  })

  it('returns at least one insight for empty context', () => {
    const insights = buildFallbackInsights({
      ...baseContext,
      balance: 0,
      income: 0,
      expense: 0,
      overdueCount: 0,
      categoryChanges: [],
      recurringMonthlyTotal: 0,
      recurringCount: 0,
    })
    expect(insights.length).toBeGreaterThan(0)
  })
})

describe('parseInsightsJson', () => {
  it('parses valid JSON insights', () => {
    const raw = JSON.stringify({
      insights: [
        { title: 'Teste', body: 'Corpo', type: 'tip' },
        { title: 'Alerta', body: 'Cuidado', type: 'warning' },
      ],
    })
    const result = parseInsightsJson(raw)
    expect(result).toHaveLength(2)
    expect(result?.[0].title).toBe('Teste')
  })

  it('parses JSON wrapped in markdown code block', () => {
    const raw = '```json\n{"insights":[{"title":"A","body":"B","type":"positive"}]}\n```'
    const result = parseInsightsJson(raw)
    expect(result).toHaveLength(1)
  })

  it('returns null for invalid JSON', () => {
    expect(parseInsightsJson('not json')).toBeNull()
  })

  it('filters invalid insight types', () => {
    const raw = JSON.stringify({
      insights: [
        { title: 'Ok', body: 'Ok', type: 'tip' },
        { title: 'Bad', body: 'Bad', type: 'invalid' },
      ],
    })
    const result = parseInsightsJson(raw)
    expect(result).toHaveLength(1)
  })
})
