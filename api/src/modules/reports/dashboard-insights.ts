import dayjs from 'dayjs'

import { env } from '@/config/env'
import { centavosToString } from '@/core/money'
import {
  buildDashboardInsightsPrompt,
  buildFallbackInsights,
  parseInsightsJson,
  type DashboardInsight,
  type DashboardInsightsContext,
} from '@/domain/ai/dashboard-context'
import { getProvider } from '@/domain/ai/providers'
import type { ProviderName } from '@/domain/ai/providers'
import { logger } from '@/lib/logger'
import type { RecurringRepository } from '@/modules/recurring/recurring.repository'
import type { RecurringFrequency } from '@/db/schemas/recurringTransactions'

import type { ReportRepository } from './report.repository'

export type InsightsReportDto = {
  insights: DashboardInsight[]
  source: 'ai' | 'fallback'
}

const CACHE_TTL_MS = 60 * 60 * 1000
const cache = new Map<string, { expiresAt: number; data: InsightsReportDto }>()

function parseAmount(centavos: bigint): number {
  return Number.parseFloat((centavosToString(centavos) ?? '0').replace(',', '.')) || 0
}

function monthlyEquivalent(amount: bigint, frequency: RecurringFrequency, interval: number): number {
  const value = parseAmount(amount)
  const safeInterval = Math.max(interval, 1)

  switch (frequency) {
    case 'daily':
      return value * (30 / safeInterval)
    case 'weekly':
      return value * (4 / safeInterval)
    case 'monthly':
      return value / safeInterval
    case 'yearly':
      return value / (12 * safeInterval)
    default:
      return value
  }
}

async function callAi(systemPrompt: string): Promise<string> {
  const providerName = env.AI_REPORT_PROVIDER as ProviderName
  const provider = getProvider(providerName)
  const messages = [{ role: 'user' as const, content: 'Gere os insights financeiros em JSON.' }]
  const chunks: string[] = []

  for await (const chunk of provider.stream(messages, systemPrompt)) {
    chunks.push(chunk)
  }

  return chunks.join('').trim()
}

export class DashboardInsightsService {
  constructor(
    private readonly reportRepository: ReportRepository,
    private readonly recurringRepository: RecurringRepository
  ) {}

  async buildContext(
    organizationId: string,
    userId: string,
    dateFrom?: string,
    dateTo?: string
  ): Promise<DashboardInsightsContext> {
    const range = {
      from: dateFrom ? dayjs(dateFrom).toDate() : dayjs().startOf('month').toDate(),
      to: dateTo ? dayjs(dateTo).toDate() : dayjs().endOf('month').toDate(),
    }

    const prevFrom = dayjs(range.from).subtract(1, 'month').startOf('month').toDate()
    const prevTo = dayjs(range.from).subtract(1, 'month').endOf('month').toDate()
    const prevRange = { from: prevFrom, to: prevTo }

    const [
      summary,
      prevSummary,
      currentCategories,
      prevCategories,
      trends,
      topPending,
      overdueTotal,
      recurring,
    ] = await Promise.all([
      this.reportRepository.getSummary(organizationId, range, userId),
      this.reportRepository.getSummary(organizationId, prevRange, userId),
      this.reportRepository.getByCategory(organizationId, range, 'expense'),
      this.reportRepository.getByCategory(organizationId, prevRange, 'expense'),
      this.reportRepository.getTrends(organizationId, 3),
      this.reportRepository.listTopPending(organizationId, 'expense', 5),
      this.reportRepository.getOverdueTotal(organizationId),
      this.recurringRepository.findAllByOrganization(organizationId),
    ])

    const income = parseAmount(summary.totalIncome)
    const expense = parseAmount(summary.totalExpense)
    const myExpense = parseAmount(summary.myExpenseTotal)
    const balance = income - myExpense
    const savingsRate = income > 0 ? (balance / income) * 100 : null

    const previousIncome = parseAmount(prevSummary.totalIncome)
    const previousExpense = parseAmount(prevSummary.totalExpense)
    const previousMyExpense = parseAmount(prevSummary.myExpenseTotal)

    const prevByName = new Map(prevCategories.map(c => [c.name, parseAmount(c.total)]))

    const categoryChanges = currentCategories.slice(0, 5).map(cat => {
      const current = parseAmount(cat.total)
      const previous = prevByName.get(cat.name) ?? 0
      const changePercent =
        previous > 0 ? ((current - previous) / previous) * 100 : current > 0 ? null : 0

      return {
        name: cat.name,
        current,
        previous,
        changePercent,
      }
    })

    const expenseRecurring = recurring.filter(r => r.type === 'expense')
    const recurringMonthlyTotal = expenseRecurring.reduce(
      (sum, r) => sum + monthlyEquivalent(r.amount, r.frequency, r.interval),
      0
    )

    return {
      monthLabel: dayjs(range.from).format('MMMM [de] YYYY'),
      income,
      expense,
      myExpense,
      balance,
      savingsRate,
      previousIncome,
      previousExpense,
      previousMyExpense,
      previousBalance: previousIncome - previousMyExpense,
      netWorth: parseAmount(summary.netWorth),
      overdueCount: summary.overdueCount,
      overdueTotal: parseAmount(overdueTotal),
      pendingCount: summary.pendingCount,
      pendingSplitsTotal: parseAmount(summary.pendingSplitsTotal),
      recurringMonthlyTotal,
      recurringCount: expenseRecurring.length,
      categoryChanges,
      recentTrends: trends.map(t => ({
        month: t.month,
        income: parseAmount(t.income),
        expense: parseAmount(t.expense),
        balance: parseAmount(t.income) - parseAmount(t.expense),
      })),
      topPendingExpenses: topPending.map(row => ({
        name: row.name,
        amount: parseAmount(row.amount),
      })),
    }
  }

  async getInsights(
    organizationId: string,
    userId: string,
    dateFrom?: string,
    dateTo?: string
  ): Promise<InsightsReportDto> {
    const monthKey = dayjs(dateFrom ?? undefined).format('YYYY-MM') || dayjs().format('YYYY-MM')
    const dateToKey = dateTo ? dayjs(dateTo).format('YYYY-MM-DD') : 'default'
    const cacheKey = `${organizationId}:${userId}:${monthKey}:${dateToKey}`
    const cached = cache.get(cacheKey)

    if (cached && cached.expiresAt > Date.now()) {
      return cached.data
    }

    const context = await this.buildContext(organizationId, userId, dateFrom, dateTo)

    try {
      const prompt = buildDashboardInsightsPrompt(context)
      const raw = await callAi(prompt)
      const insights = parseInsightsJson(raw)

      if (insights) {
        const result: InsightsReportDto = { insights, source: 'ai' }
        cache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, data: result })
        logger.info({ organizationId, monthKey }, 'Dashboard insights gerados por IA')
        return result
      }
    } catch (error) {
      logger.warn({ organizationId, error: String(error) }, 'Falha ao gerar insights por IA')
    }

    const result: InsightsReportDto = {
      insights: buildFallbackInsights(context),
      source: 'fallback',
    }
    cache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, data: result })
    return result
  }
}
