import type { AiActionName } from '../action-store'

export type FinancialContext = {
  organizationId: string
  accounts: Array<{ id: string; name: string; type: string }>
  categories: Array<{ id: string; name: string }>
  recentTransactions: Array<{
    id: string
    title: string
    amount: string | null
    type: string
    status: string
    date: string
    accountName: string | null
    categoryNames: string[]
  }>
}

export type ToolPreviewResult = {
  action: AiActionName
  data: Record<string, unknown>
  message: string
}

export type ToolCallPayload = {
  action: AiActionName
  [key: string]: unknown
}
