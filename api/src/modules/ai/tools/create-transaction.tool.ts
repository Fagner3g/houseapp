import { badRequest } from '@/core/errors'
import { centavosToString } from '@/core/money'

import type { FinancialContext, ToolCallPayload, ToolPreviewResult } from './types'

function normalizeAmount(value: unknown): string {
  if (typeof value === 'number') {
    return value.toFixed(2)
  }

  if (typeof value === 'string') {
    const cleaned = value.replace(/[R$\s]/gi, '').replace(',', '.')
    const parsed = Number.parseFloat(cleaned)

    if (!Number.isNaN(parsed)) {
      return parsed.toFixed(2)
    }
  }

  throw badRequest('Invalid amount for create_transaction')
}

function resolveAccount(
  context: FinancialContext,
  accountId?: unknown,
  accountName?: unknown
): { id: string; name: string } {
  if (typeof accountId === 'string' && accountId) {
    const account = context.accounts.find(item => item.id === accountId)

    if (!account) {
      throw badRequest('Account not found')
    }

    return { id: account.id, name: account.name }
  }

  if (typeof accountName === 'string' && accountName.trim()) {
    const normalized = accountName.trim().toLowerCase()
    const account = context.accounts.find(item => item.name.toLowerCase().includes(normalized))

    if (!account) {
      throw badRequest(`Account not found: ${accountName}`)
    }

    return { id: account.id, name: account.name }
  }

  if (context.accounts.length === 1) {
    return { id: context.accounts[0].id, name: context.accounts[0].name }
  }

  const defaultAccount =
    context.accounts.find(account => account.type !== 'credit_card') ?? context.accounts[0]

  if (defaultAccount) {
    return { id: defaultAccount.id, name: defaultAccount.name }
  }

  throw badRequest('account_id or account_name is required')
}

function resolveCategories(
  context: FinancialContext,
  categoryIds?: unknown,
  categoryName?: unknown
): { ids: string[]; names: string[] } {
  if (Array.isArray(categoryIds) && categoryIds.length > 0) {
    const ids = categoryIds.filter((id): id is string => typeof id === 'string')
    const names = ids.map(id => context.categories.find(c => c.id === id)?.name ?? id)
    return { ids, names }
  }

  if (typeof categoryName === 'string' && categoryName.trim()) {
    const normalized = categoryName.trim().toLowerCase()
    const category = context.categories.find(item => item.name.toLowerCase().includes(normalized))

    if (!category) {
      return { ids: [], names: [] }
    }

    return { ids: [category.id], names: [category.name] }
  }

  return { ids: [], names: [] }
}

export function previewCreateTransaction(
  context: FinancialContext,
  payload: ToolCallPayload
): ToolPreviewResult {
  const title = typeof payload.title === 'string' ? payload.title.trim() : ''

  if (!title) {
    throw badRequest('title is required for create_transaction')
  }

  const type =
    payload.type === 'income' || payload.type === 'expense' || payload.type === 'transfer'
      ? payload.type
      : 'expense'

  const amount = normalizeAmount(payload.amount)
  const account = resolveAccount(context, payload.account_id, payload.account_name)
  const categories = resolveCategories(context, payload.category_ids, payload.category_name)

  const date =
    typeof payload.date === 'string' && payload.date
      ? payload.date
      : new Date().toISOString().slice(0, 10)

  const status =
    payload.status === 'paid' || payload.status === 'pending' || payload.status === 'canceled'
      ? payload.status
      : 'pending'

  const data = {
    title,
    amount,
    type,
    accountId: account.id,
    accountName: account.name,
    categoryIds: categories.ids,
    categoryNames: categories.names,
    date,
    status,
    description: typeof payload.description === 'string' ? payload.description : null,
    source: 'ai_chat' as const,
  }

  const categoryLabel = categories.names.length > 0 ? categories.names.join(', ') : 'sem categoria'

  return {
    action: 'create_transaction',
    data,
    message: `Preview: ${type === 'income' ? 'Receita' : type === 'expense' ? 'Despesa' : 'Transferência'} "${title}" de R$ ${amount.replace('.', ',')} em ${account.name} (${categoryLabel}).`,
  }
}

export function formatCreateTransactionPreview(data: Record<string, unknown>): Record<string, unknown> {
  return {
    ...data,
    amountDisplay: typeof data.amount === 'string' ? `R$ ${data.amount.replace('.', ',')}` : data.amount,
    amountCentavos: typeof data.amount === 'string' ? centavosToString(BigInt(Math.round(Number(data.amount) * 100))) : null,
  }
}
