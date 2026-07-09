const EXTENSION_CHANNELS = new Set(['extension', 'in_app'])
const CHANNEL_PRIORITY = { extension: 2, in_app: 1 }
const OVERDUE_KINDS = new Set(['overdue', 'split_overdue', 'split_external_overdue'])
const UPCOMING_KINDS = new Set(['targeted_upcoming', 'split_upcoming', 'split_external', 'target_external'])

function parseNotificationAmount(metadata = {}) {
  if (metadata.amount != null && metadata.amount !== '') {
    const reais = parseFloat(String(metadata.amount).replace(',', '.')) || 0
    return { reais, cents: Math.round(reais * 100), hasAmount: reais > 0 }
  }
  if (metadata.amountCents != null && metadata.amountCents !== '') {
    const cents = Number(metadata.amountCents) || 0
    return { reais: cents / 100, cents, hasAmount: cents > 0 }
  }
  return { reais: 0, cents: 0, hasAmount: false }
}

function formatAmount(reais, hasAmount) {
  if (!hasAmount) return 'Valor a confirmar'
  return `R$ ${reais.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtDateShort(iso) {
  const d = new Date(iso)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
}

function resolveAlertKind(metadata = {}, dueDateIso) {
  const kind = metadata.kind
  if (kind && OVERDUE_KINDS.has(kind)) return 'overdue'
  if (kind && UPCOMING_KINDS.has(kind)) return 'upcoming'
  if (kind === 'overdue') return 'overdue'
  const due = new Date(dueDateIso)
  const today = new Date()
  due.setHours(0, 0, 0, 0)
  today.setHours(0, 0, 0, 0)
  return due < today ? 'overdue' : 'upcoming'
}

function formatStatusLabel(item) {
  const datePart = fmtDateShort(item.date)
  if (item.kind === 'overdue') {
    const days = item.overdueDays
    if (days === 1) return `Vencida há 1 dia · ${datePart}`
    if (days != null && days > 0) return `Vencida há ${days} dias · ${datePart}`
    return `Vencida · ${datePart}`
  }
  const days = item.daysUntilDue
  if (days === 0) return `Vence hoje · ${datePart}`
  if (days === 1) return `Vence amanhã · ${datePart}`
  if (days != null && days > 0) return `Vence em ${days} dias · ${datePart}`
  return `Próxima · ${datePart}`
}

function statusBadgeClass(kind) {
  return kind === 'overdue' ? 'badge-overdue' : 'badge-upcoming'
}

function dedupeNotifications(notifications) {
  const byKey = new Map()
  for (const n of notifications) {
    const kind = n.metadata?.kind || 'unknown'
    const key = `${n.transactionId}:${kind}`
    const existing = byKey.get(key)
    if (!existing) { byKey.set(key, n); continue }
    const existingPri = CHANNEL_PRIORITY[existing.channel] || 0
    const nextPri = CHANNEL_PRIORITY[n.channel] || 0
    if (nextPri > existingPri) { byKey.set(key, n); continue }
    if (nextPri === existingPri && new Date(n.createdAt) > new Date(existing.createdAt)) byKey.set(key, n)
  }
  return [...byKey.values()]
}

function filterExtensionNotifications(notifications, organizationId) {
  return notifications.filter(n => {
    if (!n.transactionId) return false
    if (!EXTENSION_CHANNELS.has(n.channel)) return false
    if (organizationId && n.organizationId !== organizationId) return false
    return true
  })
}

function mapNotificationToItem(notification, orgById) {
  const metadata = notification.metadata || {}
  const date = metadata.dueDate || metadata.date || notification.createdAt
  const amountInfo = parseNotificationAmount(metadata)
  const kind = resolveAlertKind(metadata, date)
  const org = orgById.get(notification.organizationId)
  return {
    notificationId: notification.id,
    transactionId: notification.transactionId,
    organizationId: notification.organizationId,
    orgSlug: org?.slug || '',
    orgName: org?.name || '',
    title: notification.title,
    amountReais: amountInfo.reais,
    amountCents: amountInfo.cents,
    hasAmount: amountInfo.hasAmount,
    date,
    kind,
    overdueDays: metadata.overdueDays != null ? Number(metadata.overdueDays) : null,
    daysUntilDue: metadata.daysUntilDue != null ? Number(metadata.daysUntilDue) : null,
    createdAt: notification.createdAt,
  }
}

function processPendingNotifications(notifications, orgs, selectedOrgId) {
  const orgById = new Map(orgs.map(o => [o.id, o]))
  return dedupeNotifications(filterExtensionNotifications(notifications, selectedOrgId))
    .map(n => mapNotificationToItem(n, orgById))
    .sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === 'overdue' ? -1 : 1
      return new Date(a.date) - new Date(b.date)
    })
}

function countByKind(items) {
  let overdue = 0
  let upcoming = 0
  for (const item of items) {
    if (item.kind === 'overdue') overdue += 1
    else upcoming += 1
  }
  return { overdue, upcoming }
}

function formatRelativeTime(iso) {
  if (!iso) return ''
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'agora'
  if (mins === 1) return 'há 1 min'
  if (mins < 60) return `há ${mins} min`
  const hours = Math.floor(mins / 60)
  return hours === 1 ? 'há 1 h' : `há ${hours} h`
}

globalThis.HouseAppNotify = {
  EXTENSION_CHANNELS,
  parseNotificationAmount,
  resolveAlertKind,
  processPendingNotifications,
  countByKind,
  formatAmount,
  formatStatusLabel,
  statusBadgeClass,
  formatRelativeTime,
  filterExtensionNotifications,
  dedupeNotifications,
}
