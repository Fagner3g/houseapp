import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { http } from '@/lib/http'

export type InvestmentAsset = {
  id: string
  symbol: string
  displayName: string
  assetClass: string
  quotePreference: 'auto' | 'manual' | 'auto_with_manual_fallback'
  notes: string
  quantity: number
  totalInvested: number
  averagePrice: number
  currentPrice: number
  currentPriceSource: 'auto' | 'manual'
  currentPriceCapturedAt: string | null
  marketValue: number
  yieldAmount: number
  yieldPercent: number
  isActive: boolean
}

export type InvestmentPlan = {
  id: string
  assetId: string
  assetSymbol: string
  assetName: string
  frequency: 'monthly'
  mode: 'amount' | 'quantity'
  progressionType: 'fixed' | 'linear_step'
  initialAmount: number | null
  initialQuantity: number | null
  stepAmount: number | null
  stepQuantity: number | null
  startDate: string
  endDate: string | null
  active: boolean
}

export type InvestmentReminder = {
  assetId: string
  assetSymbol: string
  assetName: string
  planId: string
  referenceMonth: string
  dueDate: string
  plannedAmount: number | null
  plannedQuantity: number | null
  status: 'pending' | 'overdue'
}

export type InvestmentDashboard = {
  summary: {
    totalInvested: number
    currentValue: number
    yieldAmount: number
    yieldPercent: number
    investedThisMonth: number
    pendingThisMonth: number
  }
  assets: Array<{
    id: string
    symbol: string
    displayName: string
    assetClass: string
    quantity: number
    averagePrice: number
    currentPrice: number
    currentPriceSource: 'auto' | 'manual'
    totalInvested: number
    currentValue: number
    yieldAmount: number
    yieldPercent: number
  }>
  pending: InvestmentReminder[]
  projection: Array<{
    month: string
    plannedAmount: number
    cumulativeAmount: number
    projectedMarketValue: number
  }>
  recentExecutions: Array<{
    id: string
    assetId: string
    planId: string | null
    referenceMonth: string
    investedAmount: number
    executedQuantity: number
    executedUnitPrice: number
    executedAt: string
  }>
}

export type InvestmentQuotePreview = {
  supported: boolean
  symbol: string
  price: number | null
  source: 'auto'
  message: string
}

type AssetPayload = {
  symbol: string
  displayName: string
  assetClass: string
  quotePreference: InvestmentAsset['quotePreference']
  notes?: string
}

type PlanPayload = {
  assetId: string
  mode: 'amount' | 'quantity'
  progressionType: 'fixed' | 'linear_step'
  initialAmount?: string
  initialQuantity?: number
  stepAmount?: string
  stepQuantity?: number
  startDate: string
  endDate?: string
  active?: boolean
}

type ExecutionPayload = {
  assetId: string
  planId?: string
  referenceMonth: string
  investedAmount: string
  executedQuantity: number
  executedUnitPrice: string
  executedAt?: string
}

const investmentKeys = {
  all: ['investments'] as const,
  assets: ['investments', 'assets'] as const,
  plans: ['investments', 'plans'] as const,
  reminders: ['investments', 'reminders'] as const,
  dashboard: ['investments', 'dashboard'] as const,
  quotePreview: (symbol: string, assetClass?: string) => ['investments', 'quote-preview', symbol, assetClass] as const,
}

async function getAssets() {
  const response = await http<{ assets: InvestmentAsset[] }>('/me/investments/assets', {
    method: 'GET',
  })
  return response.assets
}

async function getPlans() {
  const response = await http<{ plans: InvestmentPlan[] }>('/me/investments/plans', {
    method: 'GET',
  })
  return response.plans
}

async function getReminders() {
  const response = await http<{
    reminders: {
      summary: { total: number; overdue: number; pending: number }
      items: InvestmentReminder[]
    }
  }>('/me/investments/reminders', { method: 'GET' })

  return response.reminders
}

async function getDashboard() {
  const response = await http<{ dashboard: InvestmentDashboard }>('/me/investments/dashboard', {
    method: 'GET',
  })
  return response.dashboard
}

async function getQuotePreview(symbol: string, assetClass?: string) {
  const params = new URLSearchParams({ symbol })
  if (assetClass) params.set('assetClass', assetClass)
  const response = await http<{ preview: InvestmentQuotePreview }>(
    `/me/investments/quote-preview?${params.toString()}`,
    { method: 'GET' }
  )
  return response.preview
}

function invalidateAll(client: ReturnType<typeof useQueryClient>) {
  return Promise.all([
    client.invalidateQueries({ queryKey: investmentKeys.assets }),
    client.invalidateQueries({ queryKey: investmentKeys.plans }),
    client.invalidateQueries({ queryKey: investmentKeys.reminders }),
    client.invalidateQueries({ queryKey: investmentKeys.dashboard }),
  ])
}

export function useInvestmentAssets() {
  return useQuery({
    queryKey: investmentKeys.assets,
    queryFn: getAssets,
  })
}

export function useInvestmentPlans() {
  return useQuery({
    queryKey: investmentKeys.plans,
    queryFn: getPlans,
  })
}

export function useInvestmentReminders(enabled = true) {
  return useQuery({
    queryKey: investmentKeys.reminders,
    queryFn: getReminders,
    enabled,
    refetchInterval: 1000 * 60 * 5,
  })
}

export function useInvestmentDashboard() {
  return useQuery({
    queryKey: investmentKeys.dashboard,
    queryFn: getDashboard,
  })
}

export function useInvestmentQuotePreview(symbol: string, assetClass?: string, enabled = true) {
  return useQuery({
    queryKey: investmentKeys.quotePreview(symbol, assetClass),
    queryFn: () => getQuotePreview(symbol, assetClass),
    enabled: enabled && symbol.trim().length > 0,
    retry: false,
  })
}

export function useCreateInvestmentAsset() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (payload: AssetPayload) =>
      http('/me/investments/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    onSuccess: () => invalidateAll(client),
  })
}

export function useUpdateInvestmentAsset() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async ({ assetId, ...payload }: Partial<AssetPayload> & { assetId: string; isActive?: boolean }) =>
      http(`/me/investments/assets/${assetId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    onSuccess: () => invalidateAll(client),
  })
}

export function useDeleteInvestmentAsset() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (assetId: string) =>
      http(`/me/investments/assets/${assetId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => invalidateAll(client),
  })
}

export function useSetInvestmentQuote() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async ({ assetId, price }: { assetId: string; price: string }) =>
      http(`/me/investments/assets/${assetId}/quote`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ price }),
      }),
    onSuccess: () => invalidateAll(client),
  })
}

export function useCreateInvestmentPlan() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (payload: PlanPayload) =>
      http('/me/investments/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    onSuccess: () => invalidateAll(client),
  })
}

export function useUpdateInvestmentPlan() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async ({ planId, ...payload }: Partial<PlanPayload> & { planId: string }) =>
      http(`/me/investments/plans/${planId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    onSuccess: () => invalidateAll(client),
  })
}

export function useDeleteInvestmentPlan() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (planId: string) =>
      http(`/me/investments/plans/${planId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => invalidateAll(client),
  })
}

export function useCreateInvestmentExecution() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (payload: ExecutionPayload) =>
      http('/me/investments/executions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    onSuccess: () => invalidateAll(client),
  })
}

export function useDeleteInvestmentExecution() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (executionId: string) =>
      http(`/me/investments/executions/${executionId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => invalidateAll(client),
  })
}

export function useUpdateInvestmentExecution() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async ({ executionId, ...payload }: ExecutionPayload & { executionId: string }) =>
      http(`/me/investments/executions/${executionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    onSuccess: () => invalidateAll(client),
  })
}
