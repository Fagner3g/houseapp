import { and, desc, eq, inArray, ne } from 'drizzle-orm'

import { env } from '@/config/env'
import { db } from '@/db'
import { investmentAssets } from '@/db/schemas/investmentAssets'
import { investmentExecutions } from '@/db/schemas/investmentExecutions'
import { investmentPlans } from '@/db/schemas/investmentPlans'
import { investmentQuotes } from '@/db/schemas/investmentQuotes'

type QuotePreference = 'auto' | 'manual' | 'auto_with_manual_fallback'
type PlanMode = 'amount' | 'quantity'
type ProgressionType = 'fixed' | 'linear_step'

type AssetInput = {
  symbol: string
  displayName: string
  assetClass: string
  quotePreference: QuotePreference
  notes?: string
}

type PlanInput = {
  assetId: string
  mode: PlanMode
  progressionType: ProgressionType
  initialAmount?: bigint
  initialQuantity?: number
  stepAmount?: bigint
  stepQuantity?: number
  startDate: Date
  endDate?: Date
  active?: boolean
}

type ExecutionInput = {
  assetId: string
  planId?: string
  referenceMonth: string
  investedAmount: bigint
  executedQuantity: number
  executedUnitPrice: bigint
  executedAt: Date
}

type QuoteRecord = {
  assetId: string
  source: 'auto' | 'manual'
  price: bigint
  capturedAt: Date
}

type AutoQuoteLookupResult = {
  price: bigint | null
  status: 'supported' | 'missing_token' | 'not_found' | 'unavailable'
}

function centsToNumber(value?: bigint | null): number | null {
  if (value == null) return null
  return Number(value) / 100
}

function quantityToNumber(value?: number | null): number | null {
  if (value == null) return null
  return Number(value)
}

function toMonthKey(date: Date): string {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

function parseMonthKey(value: string): Date {
  const [year, month] = value.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, 1))
}

function startOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1))
}

function addMonths(date: Date, count: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + count, 1))
}

function monthDiff(start: Date, end: Date): number {
  return (end.getUTCFullYear() - start.getUTCFullYear()) * 12 + (end.getUTCMonth() - start.getUTCMonth())
}

function clampDueDate(baseDate: Date, targetMonth: Date): Date {
  const day = baseDate.getUTCDate()
  const lastDay = new Date(
    Date.UTC(targetMonth.getUTCFullYear(), targetMonth.getUTCMonth() + 1, 0)
  ).getUTCDate()
  return new Date(Date.UTC(targetMonth.getUTCFullYear(), targetMonth.getUTCMonth(), Math.min(day, lastDay)))
}

function isPlanActiveForMonth(
  plan: typeof investmentPlans.$inferSelect,
  targetMonth: Date
): boolean {
  if (!plan.active) return false

  const startMonth = startOfMonth(new Date(plan.startDate))
  if (targetMonth < startMonth) return false

  if (plan.endDate) {
    const endMonth = startOfMonth(new Date(plan.endDate))
    if (targetMonth > endMonth) return false
  }

  return true
}

function computePlanForMonth(
  plan: typeof investmentPlans.$inferSelect,
  targetMonth: Date,
  quotePrice?: bigint | null,
  fallbackUnitPrice?: bigint | null
) {
  const startMonth = startOfMonth(new Date(plan.startDate))
  const index = monthDiff(startMonth, targetMonth)
  if (index < 0) return null

  let amountCents: bigint | null = null
  let quantity: number | null = null

  if (plan.mode === 'amount') {
    const initial = plan.initialAmount ?? 0n
    const step = plan.progressionType === 'linear_step' ? (plan.stepAmount ?? 0n) : 0n
    amountCents = initial + step * BigInt(index)

    const unitPrice = quotePrice ?? fallbackUnitPrice
    if (unitPrice && unitPrice > 0n) {
      quantity = Number(amountCents) / Number(unitPrice)
    }
  } else {
    const initial = plan.initialQuantity ?? 0
    const step = plan.progressionType === 'linear_step' ? (plan.stepQuantity ?? 0) : 0
    quantity = initial + step * index

    const unitPrice = quotePrice ?? fallbackUnitPrice
    if (unitPrice && unitPrice > 0n) {
      amountCents = BigInt(Math.round(quantity * Number(unitPrice)))
    }
  }

  const dueDate = clampDueDate(new Date(plan.startDate), targetMonth)

  return {
    referenceMonth: toMonthKey(targetMonth),
    dueDate,
    plannedAmountCents: amountCents,
    plannedQuantity: quantity,
  }
}

function normalizeAutoQuoteSymbol(symbol: string) {
  return symbol.trim().toUpperCase().replace(/\.SA$/i, '')
}

// Mapa de tickers comuns para IDs do CoinGecko
const COINGECKO_IDS: Record<string, string> = {
  BTC: 'bitcoin',
  BITCOIN: 'bitcoin',
  ETH: 'ethereum',
  ETHEREUM: 'ethereum',
  BNB: 'binancecoin',
  SOL: 'solana',
  XRP: 'ripple',
  ADA: 'cardano',
  DOT: 'polkadot',
  MATIC: 'matic-network',
  LINK: 'chainlink',
  LTC: 'litecoin',
  DOGE: 'dogecoin',
  AVAX: 'avalanche-2',
  ATOM: 'cosmos',
  UNI: 'uniswap',
  USDT: 'tether',
  USDC: 'usd-coin',
}

async function fetchCryptoQuoteDetails(symbol: string): Promise<AutoQuoteLookupResult> {
  const normalized = symbol.trim().toUpperCase()
  const coinId = COINGECKO_IDS[normalized]
  if (!coinId) return { price: null, status: 'not_found' }

  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=brl`,
      { headers: { Accept: 'application/json' } }
    )
    if (!response.ok) return { price: null, status: 'unavailable' }

    const data = (await response.json()) as Record<string, { brl?: number }>
    const price = data[coinId]?.brl
    if (!price || !Number.isFinite(price) || price <= 0) return { price: null, status: 'not_found' }

    return { price: BigInt(Math.round(price * 100)), status: 'supported' }
  } catch {
    return { price: null, status: 'unavailable' }
  }
}

async function fetchAutoQuoteDetails(symbol: string, assetClass?: string): Promise<AutoQuoteLookupResult> {
  if (assetClass === 'Cripto') return fetchCryptoQuoteDetails(symbol)
  const normalized = normalizeAutoQuoteSymbol(symbol)
  if (!normalized) {
    return { price: null, status: 'unavailable' }
  }

  try {
    const headers: HeadersInit = {}
    if (env.BRAPI_TOKEN) {
      headers.Authorization = `Bearer ${env.BRAPI_TOKEN}`
    }

    const response = await fetch(`https://brapi.dev/api/quote/${encodeURIComponent(normalized)}`, {
      headers,
    })

    const payload = (await response.json().catch(() => null)) as
      | {
          results?: Array<{
            regularMarketPrice?: number
            regularMarketPreviousClose?: number
          }>
          error?: boolean
          message?: string
          code?: string
        }
      | null

    if (!response.ok) {
      if (
        response.status === 401 &&
        (payload?.code === 'MISSING_TOKEN' ||
          payload?.message?.toLowerCase().includes('token de autenticação não fornecido') ||
          payload?.message?.toLowerCase().includes('token'))
      ) {
        return { price: null, status: 'missing_token' }
      }

      if (response.status === 404) {
        return { price: null, status: 'not_found' }
      }

      return { price: null, status: 'unavailable' }
    }

    const result = payload?.results?.[0]
    const parsed =
      result?.regularMarketPrice ?? result?.regularMarketPreviousClose ?? null

    if (!parsed || !Number.isFinite(parsed) || parsed <= 0) {
      return { price: null, status: 'not_found' }
    }

    return {
      price: BigInt(Math.round(parsed * 100)),
      status: 'supported',
    }
  } catch {
    return { price: null, status: 'unavailable' }
  }
}

export async function fetchAutoQuote(symbol: string, assetClass?: string): Promise<bigint | null> {
  const result = await fetchAutoQuoteDetails(symbol, assetClass)
  return result.price
}

async function refreshAutoQuotes(userId: string) {
  const assets = await db
    .select()
    .from(investmentAssets)
    .where(
      and(
        eq(investmentAssets.userId, userId),
        inArray(investmentAssets.quotePreference, ['auto', 'auto_with_manual_fallback'])
      )
    )

  const THROTTLE_MS = 5 * 60 * 1000 // 5 minutos

  await Promise.all(
    assets.map(async asset => {
      // Verificar se já existe cotação recente para evitar duplicatas
      const [recent] = await db
        .select({ capturedAt: investmentQuotes.capturedAt })
        .from(investmentQuotes)
        .where(
          and(
            eq(investmentQuotes.assetId, asset.id),
            eq(investmentQuotes.source, 'auto')
          )
        )
        .orderBy(desc(investmentQuotes.capturedAt))
        .limit(1)

      if (recent && Date.now() - new Date(recent.capturedAt).getTime() < THROTTLE_MS) {
        return // Cotação ainda fresca, não precisa buscar novamente
      }

      const price = await fetchAutoQuote(asset.symbol, asset.assetClass)
      if (!price) return

      await db.insert(investmentQuotes).values({
        assetId: asset.id,
        source: 'auto',
        price,
        capturedAt: new Date(),
      })
    })
  )
}

async function getQuotesByAsset(assetIds: string[]) {
  if (assetIds.length === 0) return new Map<string, { auto?: QuoteRecord; manual?: QuoteRecord }>()

  const rows = await db
    .select()
    .from(investmentQuotes)
    .where(inArray(investmentQuotes.assetId, assetIds))
    .orderBy(desc(investmentQuotes.capturedAt))

  const latest = new Map<string, { auto?: QuoteRecord; manual?: QuoteRecord }>()

  for (const row of rows) {
    const current = latest.get(row.assetId) ?? {}
    if (row.source === 'auto' && !current.auto) current.auto = row
    if (row.source === 'manual' && !current.manual) current.manual = row
    latest.set(row.assetId, current)
  }

  return latest
}

function resolveQuote(
  preference: QuotePreference,
  latest?: { auto?: QuoteRecord; manual?: QuoteRecord }
): QuoteRecord | undefined {
  if (!latest) return undefined
  if (preference === 'manual') return latest.manual // somente manual, sem fallback automático
  if (preference === 'auto') return latest.auto // somente auto, sem fallback manual
  return latest.auto ?? latest.manual // auto_with_manual_fallback: API primeiro, manual como fallback
}

async function getUserAssetOrThrow(userId: string, assetId: string) {
  const [asset] = await db
    .select()
    .from(investmentAssets)
    .where(and(eq(investmentAssets.userId, userId), eq(investmentAssets.id, assetId)))

  if (!asset) {
    throw new Error('Asset not found')
  }

  return asset
}

async function ensureUniqueAssetSymbol(userId: string, symbol: string, assetId?: string) {
  const normalized = symbol.trim().toUpperCase()
  if (!normalized) return

  const [existing] = await db
    .select()
    .from(investmentAssets)
    .where(
      assetId
        ? and(
            eq(investmentAssets.userId, userId),
            eq(investmentAssets.symbol, normalized),
            ne(investmentAssets.id, assetId)
          )
        : and(eq(investmentAssets.userId, userId), eq(investmentAssets.symbol, normalized))
    )

  if (existing) {
    throw new Error('Asset symbol already exists for this user')
  }
}

async function getUserPlanOrThrow(userId: string, planId: string) {
  const [plan] = await db
    .select()
    .from(investmentPlans)
    .where(and(eq(investmentPlans.userId, userId), eq(investmentPlans.id, planId)))

  if (!plan) {
    throw new Error('Plan not found')
  }

  return plan
}

async function getUserExecutionOrThrow(userId: string, executionId: string) {
  const [execution] = await db
    .select()
    .from(investmentExecutions)
    .where(and(eq(investmentExecutions.userId, userId), eq(investmentExecutions.id, executionId)))

  if (!execution) {
    throw new Error('Execution not found')
  }

  return execution
}

async function getExecutionFallbackPrices(userId: string) {
  const rows = await db
    .select()
    .from(investmentExecutions)
    .where(eq(investmentExecutions.userId, userId))
    .orderBy(desc(investmentExecutions.executedAt))

  const fallback = new Map<string, bigint>()
  for (const row of rows) {
    if (!fallback.has(row.assetId)) {
      fallback.set(row.assetId, row.executedUnitPrice)
    }
  }

  return fallback
}

async function resolvePlannedExecutionValues(userId: string, input: ExecutionInput) {
  let plannedAmount: bigint | null = null
  let plannedQuantity: number | null = null

  if (input.planId) {
    const plan = await getUserPlanOrThrow(userId, input.planId)
    const monthDate = parseMonthKey(input.referenceMonth)
    const fallbackPrices = await getExecutionFallbackPrices(userId)
    const quotesByAsset = await getQuotesByAsset([plan.assetId])
    const quote = resolveQuote(
      (await getUserAssetOrThrow(userId, plan.assetId)).quotePreference,
      quotesByAsset.get(plan.assetId)
    )
    const planned = computePlanForMonth(
      plan,
      monthDate,
      quote?.price,
      fallbackPrices.get(plan.assetId)
    )
    plannedAmount = planned?.plannedAmountCents ?? null
    plannedQuantity = planned?.plannedQuantity ?? null
  }

  return { plannedAmount, plannedQuantity }
}

async function buildAssetSnapshots(userId: string) {
  await refreshAutoQuotes(userId)

  const [assets, executions] = await Promise.all([
    db.select().from(investmentAssets).where(eq(investmentAssets.userId, userId)),
    db
      .select()
      .from(investmentExecutions)
      .where(eq(investmentExecutions.userId, userId))
      .orderBy(desc(investmentExecutions.executedAt)),
  ])

  const quotesByAsset = await getQuotesByAsset(assets.map(asset => asset.id))

  const groupedExecutions = new Map<string, typeof investmentExecutions.$inferSelect[]>()
  for (const execution of executions) {
    const list = groupedExecutions.get(execution.assetId) ?? []
    list.push(execution)
    groupedExecutions.set(execution.assetId, list)
  }

  return assets.map(asset => {
    const assetExecutions = groupedExecutions.get(asset.id) ?? []
    const totalInvestedCents = assetExecutions.reduce((acc, item) => acc + item.investedAmount, 0n)
    const totalQuantity = assetExecutions.reduce((acc, item) => acc + item.executedQuantity, 0)
    const averagePriceCents =
      totalQuantity > 0 ? BigInt(Math.round(Number(totalInvestedCents) / totalQuantity)) : null
    const resolvedQuote = resolveQuote(asset.quotePreference, quotesByAsset.get(asset.id))
    const quoteCents = resolvedQuote?.price ?? averagePriceCents
    const marketValueCents =
      totalQuantity > 0 && quoteCents ? BigInt(Math.round(totalQuantity * Number(quoteCents))) : totalInvestedCents

    return {
      asset,
      totalInvestedCents,
      totalQuantity,
      averagePriceCents,
      quote: resolvedQuote,
      marketValueCents,
      yieldCents: marketValueCents - totalInvestedCents,
    }
  })
}

async function buildPendingItems(userId: string, monthsAhead = 1) {
  await refreshAutoQuotes(userId)

  const [plans, quotesByAsset, fallbackUnitPrices, executions, assets] = await Promise.all([
    db
      .select()
      .from(investmentPlans)
      .where(and(eq(investmentPlans.userId, userId), eq(investmentPlans.active, true))),
    (async () => {
      const assetRows = await db.select().from(investmentAssets).where(eq(investmentAssets.userId, userId))
      return getQuotesByAsset(assetRows.map(item => item.id))
    })(),
    getExecutionFallbackPrices(userId),
    db.select().from(investmentExecutions).where(eq(investmentExecutions.userId, userId)),
    db.select().from(investmentAssets).where(eq(investmentAssets.userId, userId)),
  ])

  const executionByPlanMonth = new Map<string, typeof investmentExecutions.$inferSelect>()
  for (const execution of executions) {
    const key = `${execution.planId ?? 'none'}:${execution.referenceMonth}`
    executionByPlanMonth.set(key, execution)
  }

  const assetById = new Map(assets.map(asset => [asset.id, asset]))
  const today = new Date()
  const currentMonth = startOfMonth(today)

  // Determina o mês mais antigo a verificar: início do plano mais antigo (máx. 24 meses atrás)
  const lookbackLimit = addMonths(currentMonth, -24)
  const earliestPlanStart = plans.reduce<Date>((earliest, plan) => {
    const planStart = startOfMonth(new Date(plan.startDate))
    return planStart < earliest ? planStart : earliest
  }, currentMonth)
  const startMonth = earliestPlanStart > lookbackLimit ? earliestPlanStart : lookbackLimit

  const pending = [] as Array<{
    assetId: string
    assetSymbol: string
    assetName: string
    planId: string
    referenceMonth: string
    dueDate: string
    plannedAmount: number | null
    plannedQuantity: number | null
    status: 'pending' | 'overdue'
  }>

  // Calcula total de meses a varrer: passados (overdue) + meses à frente
  const monthsBetween = Math.round(
    (currentMonth.getTime() - startMonth.getTime()) / (1000 * 60 * 60 * 24 * 30)
  )

  for (let monthIndex = -monthsBetween; monthIndex < monthsAhead; monthIndex += 1) {
    const monthDate = addMonths(currentMonth, monthIndex)

    for (const plan of plans) {
      if (!isPlanActiveForMonth(plan, monthDate)) continue

      const latest = quotesByAsset.get(plan.assetId)
      const resolvedQuote = resolveQuote(
        (assetById.get(plan.assetId)?.quotePreference as QuotePreference | undefined) ??
          'auto_with_manual_fallback',
        latest
      )

      const planned = computePlanForMonth(
        plan,
        monthDate,
        resolvedQuote?.price,
        fallbackUnitPrices.get(plan.assetId)
      )

      if (!planned) continue

      const key = `${plan.id}:${planned.referenceMonth}`
      if (executionByPlanMonth.has(key)) continue

      const asset = assetById.get(plan.assetId)
      if (!asset) continue

      const dueDate = new Date(planned.dueDate)
      const isPast = monthIndex < 0 || (monthIndex === 0 && dueDate < today)
      const status: 'pending' | 'overdue' = isPast ? 'overdue' : 'pending'

      pending.push({
        assetId: asset.id,
        assetSymbol: asset.symbol,
        assetName: asset.displayName,
        planId: plan.id,
        referenceMonth: planned.referenceMonth,
        dueDate: dueDate.toISOString(),
        plannedAmount: centsToNumber(planned.plannedAmountCents),
        plannedQuantity: planned.plannedQuantity,
        status,
      })
    }
  }

  // Ordena: atrasados primeiro (mais antigo → mais recente), depois pendentes
  pending.sort((a, b) => {
    if (a.status !== b.status) return a.status === 'overdue' ? -1 : 1
    return a.referenceMonth.localeCompare(b.referenceMonth)
  })

  return pending
}

export const investmentService = {
  async previewQuote(symbol: string, assetClass?: string) {
    const normalized = normalizeAutoQuoteSymbol(symbol)
    if (!normalized) {
      return {
        supported: false,
        symbol: normalized,
        price: null,
        source: 'auto' as const,
        message: 'Informe um ticker para testar a cotação automática.',
      }
    }

    const autoQuote = await fetchAutoQuoteDetails(normalized, assetClass)

    if (!autoQuote.price) {
      const message =
        autoQuote.status === 'missing_token'
          ? 'Este ticker exige token da fonte automática atual. Use manual ou configure BRAPI_TOKEN.'
          : autoQuote.status === 'not_found'
            ? 'Ticker não encontrado na fonte automática atual.'
            : 'Cotação automática indisponível na fonte automática atual.'

      return {
        supported: false,
        symbol: normalized,
        price: null,
        source: 'auto' as const,
        message,
      }
    }

    return {
      supported: true,
      symbol: normalized,
      price: centsToNumber(autoQuote.price),
      source: 'auto' as const,
      message: 'Cotação automática disponível na fonte automática atual.',
    }
  },

  async listAssets(userId: string) {
    const snapshots = await buildAssetSnapshots(userId)

    return snapshots.map(item => ({
      id: item.asset.id,
      symbol: item.asset.symbol,
      displayName: item.asset.displayName,
      assetClass: item.asset.assetClass,
      quotePreference: item.asset.quotePreference,
      notes: item.asset.notes ?? '',
      quantity: item.totalQuantity,
      totalInvested: centsToNumber(item.totalInvestedCents) ?? 0,
      averagePrice: centsToNumber(item.averagePriceCents) ?? 0,
      currentPrice: centsToNumber(item.quote?.price ?? item.averagePriceCents) ?? 0,
      currentPriceSource: item.quote?.source ?? 'manual',
      currentPriceCapturedAt: item.quote?.capturedAt?.toISOString() ?? null,
      marketValue: centsToNumber(item.marketValueCents) ?? 0,
      yieldAmount: centsToNumber(item.yieldCents) ?? 0,
      yieldPercent:
        item.totalInvestedCents > 0n
          ? Number(item.yieldCents) / Number(item.totalInvestedCents)
          : 0,
      isActive: item.asset.isActive,
    }))
  },

  async createAsset(userId: string, input: AssetInput) {
    await ensureUniqueAssetSymbol(userId, input.symbol)

    const [created] = await db
      .insert(investmentAssets)
      .values({
        userId,
        symbol: input.symbol.trim().toUpperCase(),
        displayName: input.displayName.trim(),
        assetClass: input.assetClass.trim(),
        quotePreference: input.quotePreference,
        notes: input.notes?.trim() || null,
      })
      .returning()

    return created
  },

  async updateAsset(userId: string, assetId: string, input: Partial<AssetInput> & { isActive?: boolean }) {
    const currentAsset = await getUserAssetOrThrow(userId, assetId)
    await ensureUniqueAssetSymbol(userId, input.symbol ?? currentAsset.symbol, assetId)

    const [updated] = await db
      .update(investmentAssets)
      .set({
        symbol: input.symbol?.trim().toUpperCase(),
        displayName: input.displayName?.trim(),
        assetClass: input.assetClass?.trim(),
        quotePreference: input.quotePreference,
        notes: input.notes?.trim(),
        isActive: input.isActive,
        updatedAt: new Date(),
      })
      .where(eq(investmentAssets.id, assetId))
      .returning()

    return updated
  },

  async deleteAsset(userId: string, assetId: string) {
    await getUserAssetOrThrow(userId, assetId)
    await db.delete(investmentAssets).where(eq(investmentAssets.id, assetId))
  },

  async saveManualQuote(userId: string, assetId: string, price: bigint) {
    await getUserAssetOrThrow(userId, assetId)

    const [quote] = await db
      .insert(investmentQuotes)
      .values({
        assetId,
        source: 'manual',
        price,
        capturedAt: new Date(),
      })
      .returning()

    return quote
  },

  async listPlans(userId: string) {
    const rows = await db
      .select({
        id: investmentPlans.id,
        assetId: investmentPlans.assetId,
        assetSymbol: investmentAssets.symbol,
        assetName: investmentAssets.displayName,
        frequency: investmentPlans.frequency,
        mode: investmentPlans.mode,
        progressionType: investmentPlans.progressionType,
        initialAmount: investmentPlans.initialAmount,
        initialQuantity: investmentPlans.initialQuantity,
        stepAmount: investmentPlans.stepAmount,
        stepQuantity: investmentPlans.stepQuantity,
        startDate: investmentPlans.startDate,
        endDate: investmentPlans.endDate,
        active: investmentPlans.active,
      })
      .from(investmentPlans)
      .innerJoin(investmentAssets, eq(investmentPlans.assetId, investmentAssets.id))
      .where(eq(investmentPlans.userId, userId))
      .orderBy(desc(investmentPlans.createdAt))

    return rows.map(row => ({
      id: row.id,
      assetId: row.assetId,
      assetSymbol: row.assetSymbol,
      assetName: row.assetName,
      frequency: row.frequency,
      mode: row.mode,
      progressionType: row.progressionType,
      initialAmount: centsToNumber(row.initialAmount),
      initialQuantity: quantityToNumber(row.initialQuantity),
      stepAmount: centsToNumber(row.stepAmount),
      stepQuantity: quantityToNumber(row.stepQuantity),
      startDate: row.startDate.toISOString(),
      endDate: row.endDate?.toISOString() ?? null,
      active: row.active,
    }))
  },

  async createPlan(userId: string, input: PlanInput) {
    await getUserAssetOrThrow(userId, input.assetId)

    const [created] = await db
      .insert(investmentPlans)
      .values({
        userId,
        assetId: input.assetId,
        mode: input.mode,
        progressionType: input.progressionType,
        frequency: 'monthly',
        initialAmount: input.initialAmount ?? null,
        initialQuantity: input.initialQuantity ?? null,
        stepAmount: input.stepAmount ?? null,
        stepQuantity: input.stepQuantity ?? null,
        startDate: input.startDate,
        endDate: input.endDate ?? null,
        active: input.active ?? true,
      })
      .returning()

    return created
  },

  async updatePlan(userId: string, planId: string, input: Partial<PlanInput>) {
    await getUserPlanOrThrow(userId, planId)

    const [updated] = await db
      .update(investmentPlans)
      .set({
        assetId: input.assetId,
        mode: input.mode,
        progressionType: input.progressionType,
        initialAmount: input.initialAmount,
        initialQuantity: input.initialQuantity,
        stepAmount: input.stepAmount,
        stepQuantity: input.stepQuantity,
        startDate: input.startDate,
        endDate: input.endDate,
        active: input.active,
        updatedAt: new Date(),
      })
      .where(eq(investmentPlans.id, planId))
      .returning()

    return updated
  },

  async deletePlan(userId: string, planId: string) {
    await getUserPlanOrThrow(userId, planId)
    await db.delete(investmentPlans).where(eq(investmentPlans.id, planId))
  },

  async registerExecution(userId: string, input: ExecutionInput) {
    await getUserAssetOrThrow(userId, input.assetId)
    if (input.planId) {
      await getUserPlanOrThrow(userId, input.planId)
    }

    const existing = input.planId
      ? await db
          .select()
          .from(investmentExecutions)
          .where(
            and(
              eq(investmentExecutions.userId, userId),
              eq(investmentExecutions.planId, input.planId),
              eq(investmentExecutions.referenceMonth, input.referenceMonth)
            )
          )
      : []

    if (existing.length > 0) {
      const [updated] = await db
        .update(investmentExecutions)
        .set({
          assetId: input.assetId,
          investedAmount: input.investedAmount,
          executedQuantity: input.executedQuantity,
          executedUnitPrice: input.executedUnitPrice,
          executedAt: input.executedAt,
          updatedAt: new Date(),
        })
        .where(eq(investmentExecutions.id, existing[0].id))
        .returning()

      return updated
    }

    const { plannedAmount, plannedQuantity } = await resolvePlannedExecutionValues(userId, input)

    const [created] = await db
      .insert(investmentExecutions)
      .values({
        userId,
        assetId: input.assetId,
        planId: input.planId ?? null,
        referenceMonth: input.referenceMonth,
        plannedAmount,
        plannedQuantity,
        investedAmount: input.investedAmount,
        executedQuantity: input.executedQuantity,
        executedUnitPrice: input.executedUnitPrice,
        executedAt: input.executedAt,
      })
      .returning()

    return created
  },

  async updateExecution(userId: string, executionId: string, input: ExecutionInput) {
    await getUserExecutionOrThrow(userId, executionId)
    await getUserAssetOrThrow(userId, input.assetId)
    if (input.planId) {
      await getUserPlanOrThrow(userId, input.planId)
    }

    const { plannedAmount, plannedQuantity } = await resolvePlannedExecutionValues(userId, input)

    const [updated] = await db
      .update(investmentExecutions)
      .set({
        assetId: input.assetId,
        planId: input.planId ?? null,
        referenceMonth: input.referenceMonth,
        plannedAmount,
        plannedQuantity,
        investedAmount: input.investedAmount,
        executedQuantity: input.executedQuantity,
        executedUnitPrice: input.executedUnitPrice,
        executedAt: input.executedAt,
        updatedAt: new Date(),
      })
      .where(eq(investmentExecutions.id, executionId))
      .returning()

    return updated
  },

  async deleteExecution(userId: string, executionId: string) {
    await getUserExecutionOrThrow(userId, executionId)
    await db.delete(investmentExecutions).where(eq(investmentExecutions.id, executionId))
  },

  async getReminders(userId: string) {
    const pending = await buildPendingItems(userId, 1)
    return {
      summary: {
        total: pending.length,
        overdue: pending.filter(item => item.status === 'overdue').length,
        pending: pending.filter(item => item.status === 'pending').length,
      },
      items: pending,
    }
  },

  async getDashboard(userId: string) {
    const [assetSnapshots, pending, plans, executions] = await Promise.all([
      buildAssetSnapshots(userId),
      buildPendingItems(userId, 1),
      db
        .select()
        .from(investmentPlans)
        .where(and(eq(investmentPlans.userId, userId), eq(investmentPlans.active, true))),
      db
        .select()
        .from(investmentExecutions)
        .where(eq(investmentExecutions.userId, userId))
        .orderBy(desc(investmentExecutions.referenceMonth), desc(investmentExecutions.executedAt)),
    ])

    const totalInvestedCents = assetSnapshots.reduce((acc, item) => acc + item.totalInvestedCents, 0n)
    const totalValueCents = assetSnapshots.reduce((acc, item) => acc + item.marketValueCents, 0n)
    const yieldCents = totalValueCents - totalInvestedCents
    const currentMonthKey = toMonthKey(new Date())
    const investedThisMonthCents = executions
      .filter(item => item.referenceMonth === currentMonthKey)
      .reduce((acc, item) => acc + item.investedAmount, 0n)

    const quotesByAsset = await getQuotesByAsset(assetSnapshots.map(item => item.asset.id))
    const fallbackPrices = await getExecutionFallbackPrices(userId)

    const projection = [] as Array<{
      month: string
      plannedAmount: number
      cumulativeAmount: number
      projectedMarketValue: number
    }>

    // Index executions by asset+month for quick lookup
    const executionsByAssetMonth = new Map<string, bigint>()
    for (const e of executions) {
      const key = `${e.assetId}-${e.referenceMonth}`
      executionsByAssetMonth.set(key, (executionsByAssetMonth.get(key) ?? 0n) + e.investedAmount)
    }

    let cumulativeAmountCents = 0n
    const currentBaseValueCents = totalValueCents
    for (let index = 0; index < 12; index += 1) {
      const monthDate = addMonths(startOfMonth(new Date()), index)
      const monthKey = toMonthKey(monthDate)
      // barAmount: what to show in the bar (executed or planned)
      let barAmount = 0n
      // futureAmount: only unexecuted months — added to cumulative to project the line
      let futureAmount = 0n

      for (const plan of plans) {
        if (!isPlanActiveForMonth(plan, monthDate)) continue

        const executedKey = `${plan.assetId}-${monthKey}`
        const executedAmount = executionsByAssetMonth.get(executedKey)

        if (executedAmount != null) {
          // Month already executed: show the real amount on the bar but don't
          // add to cumulative (it is already reflected in currentBaseValueCents)
          barAmount += executedAmount
        } else {
          const assetSnapshot = assetSnapshots.find(item => item.asset.id === plan.assetId)
          const planned = computePlanForMonth(
            plan,
            monthDate,
            resolveQuote(
              (assetSnapshot?.asset.quotePreference as QuotePreference | undefined) ??
                'auto_with_manual_fallback',
              quotesByAsset.get(plan.assetId)
            )?.price,
            fallbackPrices.get(plan.assetId)
          )
          const plannedCents = planned?.plannedAmountCents ?? 0n
          barAmount += plannedCents
          futureAmount += plannedCents
        }
      }

      cumulativeAmountCents += futureAmount
      projection.push({
        month: monthKey,
        plannedAmount: centsToNumber(barAmount) ?? 0,
        cumulativeAmount: centsToNumber(cumulativeAmountCents) ?? 0,
        projectedMarketValue: centsToNumber(currentBaseValueCents + cumulativeAmountCents) ?? 0,
      })
    }

    return {
      summary: {
        totalInvested: centsToNumber(totalInvestedCents) ?? 0,
        currentValue: centsToNumber(totalValueCents) ?? 0,
        yieldAmount: centsToNumber(yieldCents) ?? 0,
        yieldPercent: totalInvestedCents > 0n ? Number(yieldCents) / Number(totalInvestedCents) : 0,
        investedThisMonth: centsToNumber(investedThisMonthCents) ?? 0,
        pendingThisMonth: pending.length,
      },
      assets: assetSnapshots.map(item => ({
        id: item.asset.id,
        symbol: item.asset.symbol,
        displayName: item.asset.displayName,
        assetClass: item.asset.assetClass,
        quantity: item.totalQuantity,
        averagePrice: centsToNumber(item.averagePriceCents) ?? 0,
        currentPrice: centsToNumber(item.quote?.price ?? item.averagePriceCents) ?? 0,
        currentPriceSource: item.quote?.source ?? 'manual',
        totalInvested: centsToNumber(item.totalInvestedCents) ?? 0,
        currentValue: centsToNumber(item.marketValueCents) ?? 0,
        yieldAmount: centsToNumber(item.yieldCents) ?? 0,
        yieldPercent:
          item.totalInvestedCents > 0n ? Number(item.yieldCents) / Number(item.totalInvestedCents) : 0,
      })),
      pending,
      projection,
      recentExecutions: executions.slice(0, 8).map(item => ({
        id: item.id,
        assetId: item.assetId,
        planId: item.planId,
        referenceMonth: item.referenceMonth,
        investedAmount: centsToNumber(item.investedAmount) ?? 0,
        executedQuantity: item.executedQuantity,
        executedUnitPrice: centsToNumber(item.executedUnitPrice) ?? 0,
        executedAt: item.executedAt.toISOString(),
      })),
    }
  },
}
