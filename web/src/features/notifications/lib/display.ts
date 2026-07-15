import dayjs from 'dayjs'

import { formatCurrency, moneyStringToReais } from '@/lib/currency'

import {
  getNotificationTone,
  isDecisionNotification,
  readNotificationKind,
  readNotificationMetadata,
  type NotificationMetadata,
  type NotificationTone,
} from './kinds'

export type InboxNotification = {
  id: string
  title: string
  body: string | null
  channel: string
  transactionId: string | null
  accountId: string | null
  metadata: Record<string, unknown>
  createdAt: string
  readAt: string | null
}

export type NotificationDisplay = {
  tone: NotificationTone
  isDecision: boolean
  amountLabel: string | null
  dueLabel: string | null
  subtitle: string | null
  relativeTime: string
}

const TONE_ORDER: Record<NotificationTone, number> = {
  decision: 0,
  overdue: 1,
  upcoming: 2,
  info: 3,
}

function readAmountLabel(metadata: NotificationMetadata): string | null {
  if (metadata.amount != null && metadata.amount !== '') {
    const reais = moneyStringToReais(String(metadata.amount))
    if (reais > 0) return formatCurrency(reais)
  }
  if (metadata.amountCents != null && metadata.amountCents !== '') {
    const cents = Number(metadata.amountCents)
    if (Number.isFinite(cents) && cents > 0) return formatCurrency(cents / 100)
  }
  return null
}

function formatDueDate(iso: string): string {
  return dayjs(iso).format('DD/MM')
}

function readDueLabel(metadata: NotificationMetadata, tone: NotificationTone): string | null {
  const overdueDays =
    metadata.overdueDays != null ? Number(metadata.overdueDays) : null
  const daysUntilDue =
    metadata.daysUntilDue != null ? Number(metadata.daysUntilDue) : null
  const dueDate = typeof metadata.dueDate === 'string' ? metadata.dueDate : null

  if (tone === 'overdue' && overdueDays != null && Number.isFinite(overdueDays)) {
    if (overdueDays === 1) return 'Vencido há 1 dia'
    if (overdueDays > 0) return `Vencido há ${overdueDays} dias`
  }

  if (tone === 'upcoming' && daysUntilDue != null && Number.isFinite(daysUntilDue)) {
    if (daysUntilDue === 0) return 'Vence hoje'
    if (daysUntilDue === 1) return 'Vence amanhã'
    if (daysUntilDue > 0) return `Vence em ${daysUntilDue} dias`
  }

  if (dueDate) return `Venc. ${formatDueDate(dueDate)}`
  return null
}

export function formatRelativeCreatedAt(iso: string): string {
  const mins = Math.max(0, dayjs().diff(dayjs(iso), 'minute'))
  if (mins < 1) return 'agora'
  if (mins === 1) return 'há 1 min'
  if (mins < 60) return `há ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours === 1) return 'há 1 h'
  if (hours < 24) return `há ${hours} h`
  return dayjs(iso).format('DD/MM HH:mm')
}

export function buildNotificationDisplay(notification: InboxNotification): NotificationDisplay {
  const metadata = readNotificationMetadata(notification.metadata)
  const tone = getNotificationTone(metadata)
  const isDecision = isDecisionNotification(metadata)
  const amountLabel = readAmountLabel(metadata)
  const dueLabel = isDecision ? null : readDueLabel(metadata, tone)

  let subtitle: string | null = null
  if (isDecision) {
    subtitle = notification.body
  } else {
    const parts = [amountLabel, dueLabel].filter(Boolean)
    subtitle = parts.length > 0 ? parts.join(' · ') : notification.body
  }

  return {
    tone,
    isDecision,
    amountLabel,
    dueLabel,
    subtitle,
    relativeTime: formatRelativeCreatedAt(notification.createdAt),
  }
}

export function isInboxChannel(channel: string): boolean {
  return channel === 'in_app' || channel === 'extension'
}

export function sortInboxNotifications<T extends InboxNotification>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const metaA = readNotificationMetadata(a.metadata)
    const metaB = readNotificationMetadata(b.metadata)
    const toneDiff = TONE_ORDER[getNotificationTone(metaA)] - TONE_ORDER[getNotificationTone(metaB)]
    if (toneDiff !== 0) return toneDiff
    return dayjs(b.createdAt).valueOf() - dayjs(a.createdAt).valueOf()
  })
}

export function countInformational(items: InboxNotification[]): number {
  return items.filter(item => !isDecisionNotification(readNotificationMetadata(item.metadata)))
    .length
}

/** Prefer a cleaner title when the status is already shown as a chip. */
export function notificationTitle(notification: InboxNotification): string {
  const metadata = readNotificationMetadata(notification.metadata)
  const kind = readNotificationKind(metadata)
  if (!kind || isDecisionNotification(metadata)) return notification.title

  const stripped = notification.title.replace(
    /^(Vencido há \d+ dias?:|Vence hoje:|Vence amanhã:|Vence em \d+ dias?:|Você deve hoje:|Você deve amanhã:|Você deve em \d+ dias?:)\s*/i,
    ''
  )
  return stripped.trim() || notification.title
}
