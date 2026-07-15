import { eq } from 'drizzle-orm'

import { db } from '@/db'
import { accounts } from '@/db/schemas/accounts'
import { transactions } from '@/db/schemas/transactions'
import { users } from '@/db/schemas/users'

import type { NotificationRecord } from './notification.repository'
import { loadInstallmentSiblingTransactions } from './load-installment-siblings'
import { resolveWhatsAppAlertAmounts } from './resolve-whatsapp-alert-amounts'
import { resolveWhatsAppSplitAlertAmounts } from './resolve-whatsapp-split-alert-amounts'
import {
  buildGreeting,
  buildWhatsAppAlertMessage,
  buildWhatsAppBatchAlertMessage,
  toWhatsAppBatchItem,
} from './whatsapp-alert-message'
import { computeDaysUntilDue } from './alert-utils'
import { isOwnerResidualAlertKind } from './owner-residual-kind'
import {
  isCreditCardInvoiceAlert,
  resolveTransactionAlertDueDate,
} from './resolve-transaction-alert-due-date'

async function loadRecipientName(userId: string): Promise<string> {
  const [user] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  return user?.name?.trim() || 'você'
}

function readMetadataString(metadata: Record<string, unknown>, key: string): string | null {
  const value = metadata[key]
  return typeof value === 'string' ? value : null
}

function readMetadataNumber(metadata: Record<string, unknown>, key: string): number | null {
  const value = metadata[key]
  return typeof value === 'number' ? value : null
}

function isSplitKind(kind: string | undefined): boolean {
  return (
    kind === 'split_upcoming' ||
    kind === 'split_overdue' ||
    kind === 'split_external' ||
    kind === 'split_external_overdue'
  )
}

function isInvoiceKind(kind: string | null | undefined): boolean {
  return kind === 'invoice_upcoming' || kind === 'invoice_overdue'
}

export function getWhatsAppAlertKindCategory(kind: string | null): string {
  if (!kind) return 'alert'
  if (
    kind === 'split_payment_request' ||
    kind === 'split_payment_request_accepted' ||
    kind === 'split_payment_request_rejected'
  ) {
    return kind
  }
  if (kind.includes('overdue')) return 'overdue'
  return 'upcoming'
}

export function buildWhatsAppBatchGroupKey(
  phone: string,
  userId: string,
  organizationId: string,
  kind: string | null,
  requestId?: string | null
): string {
  if (
    kind === 'split_payment_request' ||
    kind === 'split_payment_request_accepted' ||
    kind === 'split_payment_request_rejected'
  ) {
    return `${phone}:${userId}:${kind}:${requestId ?? 'unknown'}`
  }
  const category = getWhatsAppAlertKindCategory(kind)
  if (isOwnerResidualAlertKind(kind)) {
    return `${phone}:${userId}:owner-residual:${category}`
  }
  return `${phone}:${userId}:${organizationId}:${category}`
}

export type ResolvedWhatsAppAlertContent = {
  recipientName: string
  transactionTitle: string
  accountName: string | null
  organizationName: string | null
  daysUntilDue: number
  dueDate: string
  amount: string | null
  transactionTotalAmount: string | null
  installmentAmount: string | null
  splitAmount: string | null
  splitShareInstallmentAmount: string | null
  splitPaidAmount: string | null
  splitRemainingAmount: string | null
  splitParticipantCount: number | null
  collectLumpSum: boolean | null
  kind?: string
  overdueDays?: number | null
  installmentNumber: number | null
  installmentsTotal: number | null
  isSplit: boolean
  isCreditCardInvoice: boolean
  note: string | null
}

export async function resolveWhatsAppAlertContentForNotification(
  notification: NotificationRecord
): Promise<ResolvedWhatsAppAlertContent> {
  const metadata = notification.metadata as Record<string, unknown>
  const externalName = readMetadataString(metadata, 'externalName')

  const [user] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, notification.userId))
    .limit(1)

  const kindEarly = readMetadataString(metadata, 'kind')
  const organizationNameForOwner = isOwnerResidualAlertKind(kindEarly)
    ? readMetadataString(metadata, 'organizationName')
    : null

  if (isInvoiceKind(kindEarly)) {
    const accountName = readMetadataString(metadata, 'accountName')
    const amount = readMetadataString(metadata, 'amount')
    const dueDate = readMetadataString(metadata, 'dueDate') ?? new Date().toISOString()
    const daysUntilDue = readMetadataNumber(metadata, 'daysUntilDue') ?? 0
    const overdueDays = readMetadataNumber(metadata, 'overdueDays')

    return {
      recipientName: externalName ?? user?.name ?? 'você',
      transactionTitle: accountName ? `Fatura ${accountName}` : notification.title,
      accountName,
      organizationName: organizationNameForOwner,
      daysUntilDue,
      dueDate,
      amount,
      transactionTotalAmount: amount,
      installmentAmount: null,
      splitAmount: null,
      splitShareInstallmentAmount: null,
      splitPaidAmount: null,
      splitRemainingAmount: null,
      splitParticipantCount: null,
      collectLumpSum: null,
      kind: kindEarly ?? undefined,
      overdueDays,
      installmentNumber: null,
      installmentsTotal: null,
      isSplit: false,
      isCreditCardInvoice: true,
      note: null,
    }
  }

  let transactionTitle = notification.title
  let dueDate = readMetadataString(metadata, 'dueDate') ?? new Date().toISOString()
  let daysUntilDue = readMetadataNumber(metadata, 'daysUntilDue') ?? 0
  let amount = readMetadataString(metadata, 'amount')
  let accountName: string | null = null
  let installmentNumber: number | null = null
  let installmentsTotal: number | null = null
  let isCreditCardInvoice = false
  let note: string | null = null
  let transactionTotalAmount: string | null = null
  let installmentAmount: string | null = null
  let splitAmount: string | null = null
  let splitShareInstallmentAmount: string | null = null
  let splitPaidAmount: string | null = null
  let splitRemainingAmount: string | null = null
  let splitParticipantCount: number | null = null
  let collectLumpSum: boolean | null = null

  if (notification.transactionId) {
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
      .where(eq(transactions.id, notification.transactionId))
      .limit(1)

    if (transaction) {
      transactionTitle = transaction.title
      installmentNumber = transaction.installmentNumber
      installmentsTotal = transaction.installmentsTotal
      note = transaction.description

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

      const resolvedDueDate = resolveTransactionAlertDueDate(dueDateInput)
      dueDate = resolvedDueDate.toISOString()
      daysUntilDue = computeDaysUntilDue(resolvedDueDate)
      isCreditCardInvoice = isCreditCardInvoiceAlert(dueDateInput)

      const kind = readMetadataString(metadata, 'kind') ?? undefined
      const isSplit = isSplitKind(kind)
      const splitId = readMetadataString(metadata, 'splitId')
      const siblingTransactions = await loadInstallmentSiblingTransactions(transaction)
      const amounts = isSplit
        ? ((await resolveWhatsAppSplitAlertAmounts({
            transactionId: notification.transactionId,
            splitId,
            amountOverride: amount,
          })) ??
          resolveWhatsAppAlertAmounts({
            transaction,
            siblingTransactions,
            isSplit: true,
            amountOverride: amount,
          }))
        : resolveWhatsAppAlertAmounts({
            transaction,
            siblingTransactions,
            isSplit: false,
            amountOverride: amount,
          })

      amount = amounts.amount
      transactionTotalAmount = amounts.transactionTotalAmount
      installmentAmount = amounts.installmentAmount
      splitAmount = amounts.splitAmount
      splitShareInstallmentAmount = amounts.splitShareInstallmentAmount ?? null
      splitPaidAmount = amounts.splitPaidAmount ?? null
      splitRemainingAmount = amounts.splitRemainingAmount ?? null
      splitParticipantCount = amounts.splitParticipantCount ?? null
      collectLumpSum = amounts.collectLumpSum ?? null
    }
  }

  const kind = readMetadataString(metadata, 'kind') ?? undefined
  const overdueDays = readMetadataNumber(metadata, 'overdueDays')
  const isSplit = isSplitKind(kind)

  if (transactionTotalAmount == null && amount != null && !isSplit) {
    transactionTotalAmount = amount
  }

  return {
    recipientName: externalName ?? user?.name ?? 'você',
    transactionTitle,
    accountName,
    organizationName: isOwnerResidualAlertKind(kind)
      ? readMetadataString(metadata, 'organizationName')
      : null,
    daysUntilDue,
    dueDate,
    amount,
    transactionTotalAmount,
    installmentAmount,
    splitAmount,
    splitShareInstallmentAmount,
    splitPaidAmount,
    splitRemainingAmount,
    splitParticipantCount,
    collectLumpSum,
    kind,
    overdueDays,
    installmentNumber,
    installmentsTotal,
    isSplit,
    isCreditCardInvoice,
    note,
  }
}

export function toWhatsAppBatchItemFromContent(
  content: ResolvedWhatsAppAlertContent
): import('./whatsapp-alert-message').WhatsAppAlertBatchItem {
  return toWhatsAppBatchItem({
    transactionTitle: content.transactionTitle,
    amount: content.amount,
    transactionTotalAmount: content.transactionTotalAmount,
    installmentAmount: content.installmentAmount,
    splitAmount: content.splitAmount,
    splitShareInstallmentAmount: content.splitShareInstallmentAmount,
    splitPaidAmount: content.splitPaidAmount,
    splitRemainingAmount: content.splitRemainingAmount,
    splitParticipantCount: content.splitParticipantCount,
    collectLumpSum: content.collectLumpSum,
    note: content.note,
    daysUntilDue: content.daysUntilDue,
    dueDate: content.dueDate,
    kind: content.kind,
    overdueDays: content.overdueDays,
    isCreditCardInvoice: content.isCreditCardInvoice,
    installmentNumber: content.installmentNumber,
    installmentsTotal: content.installmentsTotal,
    accountName: content.accountName,
    organizationName: content.organizationName,
    isSplit: content.isSplit,
  })
}

export async function buildWhatsAppMessageForNotification(
  notification: NotificationRecord
): Promise<string> {
  const metadata = notification.metadata as Record<string, unknown>
  if (
    metadata.kind === 'split_payment_request' ||
    metadata.kind === 'split_payment_request_accepted' ||
    metadata.kind === 'split_payment_request_rejected'
  ) {
    const recipientName = await loadRecipientName(notification.userId)
    const body = notification.body?.trim()
    if (body) {
      return `${buildGreeting(recipientName)}\n\n${body}`
    }

    const requesterName =
      typeof metadata.requesterName === 'string' ? metadata.requesterName : 'Alguém'
    const creditorName =
      typeof metadata.creditorName === 'string' ? metadata.creditorName : 'Alguém'
    const transactionTitle =
      typeof metadata.transactionTitle === 'string' ? metadata.transactionTitle : 'transação'
    const amount = typeof metadata.amount === 'string' ? metadata.amount : null
    const amountLine = amount ? `\nValor: R$ ${amount.replace('.', ',')}` : ''

    if (metadata.kind === 'split_payment_request_accepted') {
      return [
        buildGreeting(recipientName),
        '',
        `${creditorName} confirmou o seu pagamento.`,
        `Transação: ${transactionTitle}${amountLine}`,
      ].join('\n')
    }

    if (metadata.kind === 'split_payment_request_rejected') {
      return [
        buildGreeting(recipientName),
        '',
        `${creditorName} recusou a confirmação do pagamento.`,
        `Transação: ${transactionTitle}${amountLine}`,
      ].join('\n')
    }

    return [
      buildGreeting(recipientName),
      '',
      `${requesterName} pediu confirmação de pagamento.`,
      `Transação: ${transactionTitle}${amountLine}`,
      'Abra o app para confirmar ou recusar.',
    ].join('\n')
  }

  const content = await resolveWhatsAppAlertContentForNotification(notification)

  return buildWhatsAppAlertMessage({
    recipientName: content.recipientName,
    transactionTitle: content.transactionTitle,
    accountName: content.accountName,
    organizationName: content.organizationName,
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
    collectLumpSum: content.collectLumpSum,
    kind: content.kind,
    overdueDays: content.overdueDays,
    installmentNumber: content.installmentNumber,
    installmentsTotal: content.installmentsTotal,
    isSplit: content.isSplit,
    isCreditCardInvoice: content.isCreditCardInvoice,
    note: content.note,
  })
}

export async function buildWhatsAppMessageForNotificationBatch(
  notifications: NotificationRecord[]
): Promise<string> {
  const contents = await Promise.all(
    notifications.map(notification => resolveWhatsAppAlertContentForNotification(notification))
  )

  return buildWhatsAppBatchAlertMessage({
    recipientName: contents[0]?.recipientName ?? 'você',
    items: contents.map(toWhatsAppBatchItemFromContent),
  })
}

export function buildWhatsAppSendDedupeKey(
  phone: string,
  userId: string,
  transactionId: string | null,
  daysUntilDue: number | null,
  kind: string | null,
  splitId?: string | null
): string {
  if (splitId) {
    return `${phone}:${userId}:split:${splitId}:${daysUntilDue ?? 'na'}:${kind ?? 'alert'}`
  }

  return `${phone}:${userId}:${transactionId ?? 'none'}:${daysUntilDue ?? 'na'}:${kind ?? 'alert'}`
}

export function buildWhatsAppBatchSendDedupeKey(
  phone: string,
  userId: string,
  organizationId: string,
  kind: string | null,
  notificationIds: string[]
): string {
  const sortedIds = [...notificationIds].sort().join(',')
  const category = getWhatsAppAlertKindCategory(kind)
  if (isOwnerResidualAlertKind(kind)) {
    return `${phone}:${userId}:owner-residual:${category}:batch:${sortedIds}`
  }
  return `${phone}:${userId}:${organizationId}:${category}:batch:${sortedIds}`
}
