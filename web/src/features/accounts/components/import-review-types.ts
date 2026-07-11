import type { ImportStatementBody } from '@/api/generated/model'
import { isCardStatementCreditTitle } from '@houseapp/finance-core'
import { divideReais } from '@/features/transactions/installment-preview'
import { moneyStringToReais, reaisToMoneyString } from '@/lib/currency'
import { normalizePhoneDigits } from '@/lib/phone'

import type { BulkReviewImportUpdate } from '@/lib/bulk-review-import'

export type ImportReviewItem = {
  transactionId: string
  title: string
  amount: string
  type: 'income' | 'expense'
  categoryIds: string[]
}

export type StatementSplitHint = {
  mode: 'half' | 'custom' | 'full_other'
  userId?: string | null
  contactName?: string | null
  contactPhone?: string | null
  amount?: string
}

export type ParsedTransactionReviewItem = {
  id: string
  index: number
  title: string
  amount: string
  date: string
  type: 'income' | 'expense'
  installmentLabel?: string
  installmentNumber?: number
  installmentsTotal?: number
  categoryId: string | null
  splitHint?: StatementSplitHint | null
  isDuplicate?: boolean
  duplicateTransactionId?: string | null
  duplicateTransactionTitle?: string | null
}

export function hasMultipleInstallments(
  item: Pick<ParsedTransactionReviewItem, 'installmentsTotal'>
): boolean {
  return typeof item.installmentsTotal === 'number' && item.installmentsTotal > 1
}

export type SplitMode = 'none' | 'half' | 'custom' | 'full_other'

export type SplitDraftState = {
  splitMode: SplitMode
  splitPersonMode: 'member' | 'contact'
  splitUserId: string | null
  splitContactName: string
  splitContactPhone: string
  splitAmountReais: number
  notifyEnabled: boolean
  /** When true, debtor pays full share once on the first installment. */
  collectLumpSum: boolean
}

export function defaultSplitDraftState(): SplitDraftState {
  return {
    splitMode: 'none',
    splitPersonMode: 'member',
    splitUserId: null,
    splitContactName: '',
    splitContactPhone: '',
    splitAmountReais: 0,
    notifyEnabled: true,
    collectLumpSum: false,
  }
}

export function validateSplitDraft(state: SplitDraftState): string | null {
  if (state.splitMode === 'none') return null

  if (state.splitPersonMode === 'member' && !state.splitUserId) {
    return 'Selecione quem deve na divisão'
  }

  if (state.splitPersonMode === 'contact' && !state.splitContactName.trim()) {
    return 'Informe o nome do contato na divisão'
  }

  return null
}

export type ImportReviewRowState = {
  id: string
  categoryId: string | null
  splitMode: SplitMode
  splitPersonMode: 'member' | 'contact'
  splitUserId: string | null
  splitContactName: string
  splitContactPhone: string
  splitAmountReais: number
  validated: boolean
}

export function buildItemsFromParsedTransactions(
  transactions: ImportStatementBody['transactions']
): ParsedTransactionReviewItem[] {
  return transactions.map((tx, index) => {
    const splitHint = (tx as { splitHint?: StatementSplitHint | null }).splitHint

    return {
      id: `preview-${index}`,
      index,
      title: tx.title,
      amount: tx.amount,
      date: tx.date,
      type: (tx.type ?? 'expense') as 'income' | 'expense',
      installmentLabel:
        tx.installmentNumber && tx.installmentsTotal
          ? `${tx.installmentNumber}/${tx.installmentsTotal}`
          : undefined,
      installmentNumber: tx.installmentNumber,
      installmentsTotal: tx.installmentsTotal,
      categoryId: isCardStatementCreditTitle(tx.title)
        ? null
        : (tx.categoryIds?.[0] ?? null),
      splitHint: splitHint ?? null,
      isDuplicate: (tx as { isDuplicate?: boolean }).isDuplicate ?? false,
      duplicateTransactionId:
        (tx as { duplicateTransactionId?: string | null }).duplicateTransactionId ?? null,
      duplicateTransactionTitle:
        (tx as { duplicateTransactionTitle?: string | null }).duplicateTransactionTitle ?? null,
    }
  })
}

function applySplitHintToRow(
  row: ImportReviewRowState,
  hint: StatementSplitHint,
  amountCentsString: string
): ImportReviewRowState {
  const totalReais = moneyStringToReais(amountCentsString)

  return {
    ...row,
    splitMode: hint.mode,
    splitAmountReais:
      hint.amount != null
        ? Number(hint.amount)
        : hint.mode === 'half'
          ? totalReais / 2
          : hint.mode === 'full_other'
            ? totalReais
            : totalReais / 2,
  }
}

export function buildInitialReviewRows(
  items: Array<{
    id?: string
    transactionId?: string
    categoryIds?: string[]
    categoryId?: string | null
    amount: string
    splitHint?: StatementSplitHint | null
    isDuplicate?: boolean
  }>
): Record<string, ImportReviewRowState> {
  const rows: Record<string, ImportReviewRowState> = {}

  for (const item of items) {
    const id = item.id ?? item.transactionId
    if (!id) continue
    const baseRow: ImportReviewRowState = {
      id,
      categoryId: item.categoryId ?? item.categoryIds?.[0] ?? null,
      splitMode: 'none',
      splitPersonMode: 'member',
      splitUserId: null,
      splitContactName: '',
      splitContactPhone: '',
      splitAmountReais: moneyStringToReais(item.amount) / 2,
      validated: item.isDuplicate === true,
    }

    rows[id] =
      item.splitHint != null
        ? applySplitHintToRow(baseRow, item.splitHint, item.amount)
        : baseRow
  }

  return rows
}

export function resolveSplitAmountReais(
  amountCentsString: string,
  mode: SplitMode,
  customAmountReais: number
): number {
  const totalReais = moneyStringToReais(amountCentsString)
  if (mode === 'half') return totalReais / 2
  if (mode === 'full_other') return totalReais
  if (mode === 'custom') return customAmountReais
  return 0
}

export function applyReviewToImportBody(
  parsed: ImportStatementBody,
  rows: Record<string, ImportReviewRowState>,
  items: ParsedTransactionReviewItem[],
  invoiceOptions?: {
    isClosed: boolean
    isPaid: boolean
    paymentSourceAccountId?: string
    paymentDate?: string
  }
): ImportStatementBody {
  return {
    ...parsed,
    isClosed: invoiceOptions?.isClosed ?? parsed.isClosed ?? false,
    isPaid: invoiceOptions?.isPaid ?? parsed.isPaid ?? false,
    paymentSourceAccountId: invoiceOptions?.paymentSourceAccountId,
    paymentDate: invoiceOptions?.paymentDate,
    transactions: parsed.transactions.map((tx, index) => {
      const item = items[index]
      const row = item ? rows[item.id] : undefined
      const exemptFromCategory = item ? isCardStatementCreditTitle(item.title) : false
      return {
        ...tx,
        categoryIds: exemptFromCategory
          ? undefined
          : row?.categoryId
            ? [row.categoryId]
            : tx.categoryIds,
      }
    }),
  }
}

export function buildSplitCreateBody(
  amountCentsString: string,
  state: Pick<
    SplitDraftState,
    | 'splitMode'
    | 'splitPersonMode'
    | 'splitUserId'
    | 'splitContactName'
    | 'splitContactPhone'
    | 'splitAmountReais'
    | 'notifyEnabled'
  > & {
    collectLumpSum?: boolean
  },
  context?: {
    installmentsTotal?: number | null
    installmentNumber?: number | null
  }
): {
  userId?: string | null
  contactName?: string | null
  contactPhone?: string | null
  amount: string
  description?: string | null
  notifyEnabled?: boolean
  collectLumpSum?: boolean
} | null {
  if (state.splitMode === 'none') return null

  let splitAmountReais = resolveSplitAmountReais(
    amountCentsString,
    state.splitMode,
    state.splitAmountReais
  )

  const installmentsTotal = context?.installmentsTotal ?? null
  const installmentNumber = context?.installmentNumber ?? null
  if (
    !state.collectLumpSum &&
    state.splitMode === 'custom' &&
    installmentsTotal != null &&
    installmentsTotal >= 2 &&
    installmentNumber != null
  ) {
    splitAmountReais =
      divideReais(state.splitAmountReais, installmentsTotal)[installmentNumber - 1] ?? 0
  }

  if (splitAmountReais <= 0) return null

  const description =
    state.splitMode === 'full_other'
      ? 'Compra de outra pessoa no meu cartão'
      : 'Divisão da despesa'

  const collectLumpSum = state.collectLumpSum || undefined

  if (state.splitPersonMode === 'member' && state.splitUserId) {
    return {
      userId: state.splitUserId,
      amount: reaisToMoneyString(splitAmountReais),
      description,
      notifyEnabled: state.notifyEnabled,
      ...(collectLumpSum ? { collectLumpSum: true } : {}),
    }
  }

  if (state.splitPersonMode === 'contact' && state.splitContactName.trim()) {
    return {
      contactName: state.splitContactName.trim(),
      contactPhone: normalizePhoneDigits(state.splitContactPhone) || null,
      amount: reaisToMoneyString(splitAmountReais),
      description,
      notifyEnabled: state.notifyEnabled,
      ...(collectLumpSum ? { collectLumpSum: true } : {}),
    }
  }

  return null
}

function resolveSplitInstallmentContext(
  item: ParsedTransactionReviewItem | ImportReviewItem
): { installmentsTotal: number; installmentNumber: number } | undefined {
  if (!('installmentsTotal' in item)) return undefined
  const installmentsTotal = item.installmentsTotal
  const installmentNumber = item.installmentNumber
  if (
    installmentsTotal == null ||
    installmentsTotal < 2 ||
    installmentNumber == null
  ) {
    return undefined
  }
  return { installmentsTotal, installmentNumber }
}

export function buildSplitPayload(
  item: ParsedTransactionReviewItem | ImportReviewItem,
  row: ImportReviewRowState
): BulkReviewImportUpdate['split'] | null {
  const body = buildSplitCreateBody(item.amount, row, resolveSplitInstallmentContext(item))
  if (!body) return null

  const { notifyEnabled: _notifyEnabled, ...split } = body
  return split
}

export function buildPostImportUpdates(
  items: ParsedTransactionReviewItem[],
  rows: Record<string, ImportReviewRowState>,
  transactionIds: string[]
): BulkReviewImportUpdate[] {
  let createdIndex = 0

  return items
    .map(item => {
      if (item.isDuplicate) return null

      const row = rows[item.id]
      const transactionId = transactionIds[createdIndex]
      createdIndex += 1
      if (!row || !transactionId) return null

      const split = buildSplitPayload(item, row)
      const update: BulkReviewImportUpdate = { transactionId }

      if (row.categoryId && !isCardStatementCreditTitle(item.title)) {
        update.categoryIds = [row.categoryId]
      }

      if (split) {
        update.split = split
      }

      if (!update.categoryIds && !update.split) return null
      return update
    })
    .filter((item): item is BulkReviewImportUpdate => item !== null)
}
