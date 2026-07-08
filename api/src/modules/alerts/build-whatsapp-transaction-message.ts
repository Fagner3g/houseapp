import { eq } from 'drizzle-orm'

import { db } from '@/db'
import { accounts } from '@/db/schemas/accounts'
import { transactions } from '@/db/schemas/transactions'

import { computeDaysUntilDue } from './alert-utils'
import type { ResolvedWhatsAppAlertContent } from './resolve-whatsapp-alert-context'
import { loadInstallmentSiblingTransactions } from './load-installment-siblings'
import { resolveWhatsAppAlertAmounts } from './resolve-whatsapp-alert-amounts'
import { resolveWhatsAppSplitAlertAmounts } from './resolve-whatsapp-split-alert-amounts'
import {
  buildWhatsAppAlertMessage,
  buildWhatsAppBatchAlertMessage,
  toWhatsAppBatchItem,
} from './whatsapp-alert-message'
import {
  isCreditCardInvoiceAlert,
  resolveTransactionAlertDueDate,
} from './resolve-transaction-alert-due-date'

type TransactionAlertParams = {
  transactionId: string
  daysUntilDue?: number
  kind: 'upcoming' | 'overdue'
  overdueDays?: number
  amountOverride?: string | null
  isSplit?: boolean
  splitId?: string | null
}

export async function resolveWhatsAppAlertContentForTransaction(
  params: TransactionAlertParams
): Promise<ResolvedWhatsAppAlertContent | null> {
  const [transaction] = await db
    .select({
      organizationId: transactions.organizationId,
      title: transactions.title,
      description: transactions.description,
      date: transactions.date,
      competenceDate: transactions.competenceDate,
      amount: transactions.amount,
      accountId: transactions.accountId,
      cardId: transactions.cardId,
      type: transactions.type,
      installmentNumber: transactions.installmentNumber,
      installmentsTotal: transactions.installmentsTotal,
    })
    .from(transactions)
    .where(eq(transactions.id, params.transactionId))
    .limit(1)

  if (!transaction) return null

  let accountName: string | null = null
  let accountType: string | null = null
  let closingDay: number | null = null
  let dueDay: number | null = null

  if (transaction.accountId) {
    const [account] = await db
      .select({
        name: accounts.name,
        type: accounts.type,
        closingDay: accounts.closingDay,
        dueDay: accounts.dueDay,
      })
      .from(accounts)
      .where(eq(accounts.id, transaction.accountId))
      .limit(1)

    accountName = account?.name ?? null
    accountType = account?.type ?? null
    closingDay = account?.closingDay ?? null
    dueDay = account?.dueDay ?? null
  }

  const dueDateInput = {
    date: transaction.date,
    competenceDate: transaction.competenceDate,
    installmentNumber: transaction.installmentNumber,
    type: transaction.type,
    accountType,
    closingDay,
    dueDay,
  }
  const dueDate = resolveTransactionAlertDueDate(dueDateInput)
  const daysUntilDue = params.daysUntilDue ?? computeDaysUntilDue(dueDate)
  const siblingTransactions = await loadInstallmentSiblingTransactions(transaction)
  const amounts = params.isSplit
    ? ((await resolveWhatsAppSplitAlertAmounts({
        transactionId: params.transactionId,
        splitId: params.splitId,
        amountOverride: params.amountOverride,
      })) ??
      resolveWhatsAppAlertAmounts({
        transaction,
        siblingTransactions,
        isSplit: true,
        amountOverride: params.amountOverride,
      }))
    : resolveWhatsAppAlertAmounts({
        transaction,
        siblingTransactions,
        isSplit: false,
        amountOverride: params.amountOverride,
      })

  return {
    recipientName: '',
    transactionTitle: transaction.title,
    accountName,
    daysUntilDue,
    dueDate: dueDate.toISOString(),
    amount: amounts.amount,
    transactionTotalAmount: amounts.transactionTotalAmount,
    installmentAmount: amounts.installmentAmount,
    splitAmount: amounts.splitAmount,
    splitShareInstallmentAmount: amounts.splitShareInstallmentAmount ?? null,
    splitPaidAmount: amounts.splitPaidAmount ?? null,
    splitRemainingAmount: amounts.splitRemainingAmount ?? null,
    splitParticipantCount: amounts.splitParticipantCount ?? null,
    kind: params.kind,
    overdueDays: params.overdueDays,
    installmentNumber: transaction.installmentNumber,
    installmentsTotal: transaction.installmentsTotal,
    isSplit: params.isSplit ?? false,
    isCreditCardInvoice: isCreditCardInvoiceAlert(dueDateInput),
    note: transaction.description,
  }
}

export async function buildWhatsAppMessageForTransaction(params: {
  recipientName: string
  transactionId: string
  daysUntilDue: number
  kind: 'upcoming' | 'overdue'
  overdueDays?: number
  amountOverride?: string | null
  isSplit?: boolean
}): Promise<string | null> {
  const content = await resolveWhatsAppAlertContentForTransaction(params)
  if (!content) return null

  return buildWhatsAppAlertMessage({
    recipientName: params.recipientName,
    transactionTitle: content.transactionTitle,
    accountName: content.accountName,
    daysUntilDue: content.daysUntilDue,
    dueDate: content.dueDate,
    amount: content.amount,
    transactionTotalAmount: content.transactionTotalAmount,
    installmentAmount: content.installmentAmount,
    splitAmount: content.splitAmount,
    splitShareInstallmentAmount: content.splitShareInstallmentAmount,
    splitPaidAmount: content.splitPaidAmount,
    splitRemainingAmount: content.splitRemainingAmount,
    splitParticipantCount: content.splitParticipantCount,
    kind: content.kind,
    overdueDays: content.overdueDays,
    installmentNumber: content.installmentNumber,
    installmentsTotal: content.installmentsTotal,
    isSplit: content.isSplit,
    isCreditCardInvoice: content.isCreditCardInvoice,
    note: content.note,
  })
}

export async function buildWhatsAppBatchMessageForTransactions(params: {
  recipientName: string
  items: TransactionAlertParams[]
}): Promise<string | null> {
  const contents = (
    await Promise.all(params.items.map(item => resolveWhatsAppAlertContentForTransaction(item)))
  ).filter((content): content is ResolvedWhatsAppAlertContent => content !== null)

  if (contents.length === 0) return null

  return buildWhatsAppBatchAlertMessage({
    recipientName: params.recipientName,
    items: contents.map(content =>
      toWhatsAppBatchItem({
        transactionTitle: content.transactionTitle,
        amount: content.amount,
        transactionTotalAmount: content.transactionTotalAmount,
        installmentAmount: content.installmentAmount,
        splitAmount: content.splitAmount,
        splitShareInstallmentAmount: content.splitShareInstallmentAmount,
        splitPaidAmount: content.splitPaidAmount,
        splitRemainingAmount: content.splitRemainingAmount,
        splitParticipantCount: content.splitParticipantCount,
        note: content.note,
        daysUntilDue: content.daysUntilDue,
        dueDate: content.dueDate,
        kind: content.kind,
        overdueDays: content.overdueDays,
        isCreditCardInvoice: content.isCreditCardInvoice,
        installmentNumber: content.installmentNumber,
        installmentsTotal: content.installmentsTotal,
        accountName: content.accountName,
        isSplit: content.isSplit,
      })
    ),
  })
}
