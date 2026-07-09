function parseTxAmount(amount) {
  if (amount == null || amount === '') return { reais: 0, cents: 0, hasAmount: false }
  const reais = parseFloat(String(amount).replace(',', '.')) || 0
  return { reais, cents: Math.round(reais * 100), hasAmount: reais > 0 }
}

function computeDueTiming(dateIso) {
  const due = new Date(dateIso)
  const today = new Date()
  due.setHours(0, 0, 0, 0)
  today.setHours(0, 0, 0, 0)
  const diff = Math.round((due - today) / 86400000)
  if (diff < 0) {
    return { kind: 'overdue', overdueDays: Math.abs(diff), daysUntilDue: null }
  }
  return { kind: 'upcoming', overdueDays: null, daysUntilDue: diff }
}

function mapTransactionToItem(tx, org, kind) {
  const amountInfo = parseTxAmount(tx.amount)
  const timing = computeDueTiming(tx.date)
  const resolvedKind = kind || timing.kind
  return {
    notificationId: null,
    transactionId: tx.id,
    organizationId: org.id,
    orgSlug: org.slug,
    orgName: org.name,
    title: tx.title,
    amountReais: amountInfo.reais,
    amountCents: amountInfo.cents,
    hasAmount: amountInfo.hasAmount,
    date: tx.date,
    kind: resolvedKind,
    overdueDays: resolvedKind === 'overdue' ? timing.overdueDays : null,
    daysUntilDue: resolvedKind === 'upcoming' ? timing.daysUntilDue : null,
    createdAt: tx.date,
  }
}

function indexNotificationsByTx(notifications, orgs, orgId) {
  const items = globalThis.HouseAppNotify.processPendingNotifications(notifications, orgs, orgId)
  return new Map(items.map(item => [item.transactionId, item]))
}

function sortAlertItems(items) {
  return items.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'overdue' ? -1 : 1
    return new Date(a.date) - new Date(b.date)
  })
}

function mergeDbWithNotifications(dbItems, notificationByTx) {
  return sortAlertItems(
    dbItems.map(item => {
      const notif = notificationByTx.get(item.transactionId)
      if (!notif) return item
      return {
        ...item,
        notificationId: notif.notificationId,
        title: notif.title || item.title,
        amountReais: notif.hasAmount ? notif.amountReais : item.amountReais,
        amountCents: notif.hasAmount ? notif.amountCents : item.amountCents,
        hasAmount: notif.hasAmount || item.hasAmount,
        overdueDays: notif.overdueDays ?? item.overdueDays,
        daysUntilDue: notif.daysUntilDue ?? item.daysUntilDue,
      }
    })
  )
}

function buildOrgAlertItems({ overdueTransactions, upcomingTransactions, notifications, orgs, orgId }) {
  const org = orgs.find(o => o.id === orgId)
  if (!org) return []

  const overdueItems = (overdueTransactions || []).map(tx => mapTransactionToItem(tx, org, 'overdue'))
  const upcomingItems = (upcomingTransactions || []).map(tx => mapTransactionToItem(tx, org, 'upcoming'))
  const notificationByTx = indexNotificationsByTx(notifications, orgs, orgId)
  return mergeDbWithNotifications([...overdueItems, ...upcomingItems], notificationByTx)
}

function buildAllOrgAlertItems({ orgDataList, notifications, orgs }) {
  const all = []
  for (const { orgId, overdueTransactions, upcomingTransactions } of orgDataList) {
    all.push(
      ...buildOrgAlertItems({ overdueTransactions, upcomingTransactions, notifications, orgs, orgId })
    )
  }
  return sortAlertItems(all)
}

function yesterdayEndIso() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  d.setHours(23, 59, 59, 999)
  return d.toISOString()
}

globalThis.HouseAppAlertItems = {
  buildOrgAlertItems,
  buildAllOrgAlertItems,
  yesterdayEndIso,
  parseTxAmount,
  computeDueTiming,
  mapTransactionToItem,
}
