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

function formatOverdueLabel(days) {
  if (days === 1) return 'Vencida há 1 dia'
  if (days != null && days > 0) return `Vencida há ${days} dias`
  return 'Vencida'
}

function formatUpcomingLabel(days) {
  if (days === 0) return 'Vence hoje'
  if (days === 1) return 'Vence amanhã'
  if (days != null && days > 0) return `Vence em ${days} dias`
  return 'Próxima'
}

function isFutureScheduled(paymentScheduledAt) {
  if (!paymentScheduledAt) return false
  return new Date(paymentScheduledAt).getTime() > Date.now()
}

function getStatusBadges(item) {
  const badges = []
  const isPartiallyPaid = item.isPartiallyPaid || item.txStatus === 'partial'

  if (isPartiallyPaid) {
    badges.push({
      key: 'partial',
      label: 'Pagamento parcial',
      badgeClass: 'badge-partial',
    })
  }

  if (item.kind === 'scheduled' && isFutureScheduled(item.paymentScheduledAt)) {
    badges.push({
      key: 'scheduled',
      label: `Agendado para ${fmtDateShort(item.paymentScheduledAt || item.date)}`,
      badgeClass: 'badge-scheduled',
    })
    if (item.overdueDays != null && item.overdueDays > 0) {
      const dueIso = item.dueDate || item.date
      badges.push({
        key: 'due-date',
        label: `Venc. ${fmtDateShort(dueIso)}`,
        badgeClass: 'badge-due-date',
      })
    }
    return badges
  }

  if (item.kind === 'overdue') {
    badges.push({
      key: 'overdue',
      label: formatOverdueLabel(item.overdueDays),
      badgeClass: 'badge-overdue',
    })
    return badges
  }

  badges.push({
    key: 'upcoming',
    label: formatUpcomingLabel(item.daysUntilDue),
    badgeClass: 'badge-upcoming',
  })
  return badges
}

function formatStatusLabel(item) {
  return getStatusBadges(item)
    .map(badge => badge.label)
    .join(' · ')
}

function statusBadgeClass(kind) {
  if (kind === 'overdue') return 'badge-overdue'
  if (kind === 'scheduled') return 'badge-scheduled'
  if (kind === 'partial') return 'badge-partial'
  return 'badge-upcoming'
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
      const order = { overdue: 0, scheduled: 1, upcoming: 2 }
      const orderA = order[a.kind] ?? 9
      const orderB = order[b.kind] ?? 9
      if (orderA !== orderB) return orderA - orderB
      return new Date(a.date) - new Date(b.date)
    })
}

function countByKind(items) {
  let overdue = 0
  let upcoming = 0
  let scheduled = 0
  for (const item of items) {
    if (item.kind === 'overdue') overdue += 1
    else if (item.kind === 'scheduled') scheduled += 1
    else upcoming += 1
  }
  return { overdue, upcoming, scheduled }
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
  getStatusBadges,
  statusBadgeClass,
  formatRelativeTime,
  filterExtensionNotifications,
  dedupeNotifications,
}
