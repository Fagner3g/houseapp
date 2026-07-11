function parseMoneyReais(value) {
  if (value == null || value === '') return 0
  return parseFloat(String(value).replace(',', '.')) || 0
}

function transactionRemainingReais(amount, paidAmount) {
  return Math.max(0, parseMoneyReais(amount) - parseMoneyReais(paidAmount))
}

function resolveTransactionListAmountReais(amount, paidAmount, splitPaidReais = 0) {
  return Math.max(0, transactionRemainingReais(amount, paidAmount) - splitPaidReais)
}

function isTransactionPartiallyPaid(amount, paidAmount, splitPaidReais = 0) {
  const totalReais = parseMoneyReais(amount)
  if (totalReais <= 0) return false
  const remainingReais = resolveTransactionListAmountReais(amount, paidAmount, splitPaidReais)
  return remainingReais > 0 && remainingReais < totalReais
}

function indexSplitPaidTotals(splitPaidTotals = []) {
  return new Map(
    splitPaidTotals.map(item => [item.transactionId, parseMoneyReais(item.paidAmount)])
  )
}

async function fetchSplitPaidTotals(apiUrl, token, orgSlug, transactionIds) {
  if (!transactionIds.length) return new Map()
  const res = await fetch(`${apiUrl}/organizations/${orgSlug}/splits/transaction-ids`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ transactionIds }),
  })
  if (!res.ok) return new Map()
  const data = await res.json()
  return indexSplitPaidTotals(data.splitPaidTotals || [])
}

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

function isFutureScheduled(paymentScheduledAt) {
  if (!paymentScheduledAt) return false
  return new Date(paymentScheduledAt).getTime() > Date.now()
}

function mapTransactionToItem(tx, org, kind, splitPaidReais = 0) {
  const totalAmountInfo = parseTxAmount(tx.amount)
  const remainingReais = resolveTransactionListAmountReais(
    tx.amount,
    tx.paidAmount,
    splitPaidReais
  )
  const amountReais = tx.status === 'paid' ? totalAmountInfo.reais : remainingReais
  const dueDate = tx.date
  const timing = computeDueTiming(dueDate)

  if (isFutureScheduled(tx.paymentScheduledAt)) {
    return {
      notificationId: null,
      transactionId: tx.id,
      organizationId: org.id,
      orgSlug: org.slug,
      orgName: org.name,
      title: tx.title,
      amountReais,
      amountCents: Math.round(amountReais * 100),
      hasAmount: totalAmountInfo.hasAmount,
      isPartiallyPaid: isTransactionPartiallyPaid(tx.amount, tx.paidAmount, splitPaidReais),
      txStatus: tx.status || 'pending',
      date: tx.paymentScheduledAt,
      dueDate,
      paymentScheduledAt: tx.paymentScheduledAt,
      kind: 'scheduled',
      overdueDays: timing.kind === 'overdue' ? timing.overdueDays : null,
      daysUntilDue: null,
      createdAt: tx.paymentScheduledAt,
    }
  }

  const resolvedKind = kind || timing.kind
  return {
    notificationId: null,
    transactionId: tx.id,
    organizationId: org.id,
    orgSlug: org.slug,
    orgName: org.name,
    title: tx.title,
    amountReais,
    amountCents: Math.round(amountReais * 100),
    hasAmount: totalAmountInfo.hasAmount,
    isPartiallyPaid: isTransactionPartiallyPaid(tx.amount, tx.paidAmount, splitPaidReais),
    txStatus: tx.status || 'pending',
    date: dueDate,
    dueDate,
    paymentScheduledAt: tx.paymentScheduledAt || null,
    kind: resolvedKind,
    overdueDays: resolvedKind === 'overdue' ? timing.overdueDays : null,
    daysUntilDue: resolvedKind === 'upcoming' ? timing.daysUntilDue : null,
    createdAt: dueDate,
  }
}

function indexNotificationsByTx(notifications, orgs, orgId) {
  const items = globalThis.HouseAppNotify.processPendingNotifications(notifications, orgs, orgId)
  return new Map(items.map(item => [item.transactionId, item]))
}

const KIND_ORDER = { overdue: 0, scheduled: 1, upcoming: 2 }

function sortAlertItems(items) {
  return items.sort((a, b) => {
    const orderA = KIND_ORDER[a.kind] ?? 9
    const orderB = KIND_ORDER[b.kind] ?? 9
    if (orderA !== orderB) return orderA - orderB
    return new Date(a.date) - new Date(b.date)
  })
}

function mergeDbWithNotifications(dbItems, notificationByTx) {
  return sortAlertItems(
    dbItems.map(item => {
      const notif = notificationByTx.get(item.transactionId)
      if (!notif) return item
      if (item.kind === 'scheduled') return item
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

function buildOrgAlertItems({
  overdueTransactions,
  upcomingTransactions,
  scheduledTransactions,
  notifications,
  orgs,
  orgId,
  splitPaidById = new Map(),
}) {
  const org = orgs.find(o => o.id === orgId)
  if (!org) return []

  const scheduledTxs = (scheduledTransactions || []).filter(tx =>
    isFutureScheduled(tx.paymentScheduledAt)
  )
  const scheduledIds = new Set(scheduledTxs.map(tx => tx.id))

  const overdueItems = (overdueTransactions || [])
    .filter(tx => !scheduledIds.has(tx.id) && !isFutureScheduled(tx.paymentScheduledAt))
    .map(tx => mapTransactionToItem(tx, org, 'overdue', splitPaidById.get(tx.id) || 0))

  const upcomingItems = (upcomingTransactions || [])
    .filter(tx => !scheduledIds.has(tx.id) && !isFutureScheduled(tx.paymentScheduledAt))
    .map(tx => mapTransactionToItem(tx, org, 'upcoming', splitPaidById.get(tx.id) || 0))

  const scheduledItems = scheduledTxs
    .map(tx => mapTransactionToItem(tx, org, undefined, splitPaidById.get(tx.id) || 0))
    .filter(item => item.kind === 'scheduled')

  const notificationByTx = indexNotificationsByTx(notifications, orgs, orgId)
  return mergeDbWithNotifications(
    [...overdueItems, ...upcomingItems, ...scheduledItems],
    notificationByTx
  )
}

function buildAllOrgAlertItems({ orgDataList, notifications, orgs }) {
  const all = []
  for (const {
    orgId,
    overdueTransactions,
    upcomingTransactions,
    scheduledTransactions,
    splitPaidById,
  } of orgDataList) {
    all.push(
      ...buildOrgAlertItems({
        overdueTransactions,
        upcomingTransactions,
        scheduledTransactions,
        notifications,
        orgs,
        orgId,
        splitPaidById,
      })
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

const DEFAULT_UPCOMING_PERIOD = '7'

function resolveUpcomingPeriod(period = DEFAULT_UPCOMING_PERIOD) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dateFrom = new Date(today)

  let dateTo
  if (period === 'month') {
    dateTo = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999)
  } else {
    const days = Math.max(1, Math.min(90, Number(period) || Number(DEFAULT_UPCOMING_PERIOD)))
    dateTo = new Date(today)
    dateTo.setDate(dateTo.getDate() + days)
    dateTo.setHours(23, 59, 59, 999)
  }

  return { dateFrom: dateFrom.toISOString(), dateTo: dateTo.toISOString() }
}

function buildUpcomingParams(period = DEFAULT_UPCOMING_PERIOD) {
  const { dateFrom, dateTo } = resolveUpcomingPeriod(period)
  return new URLSearchParams({
    status: 'pending',
    dateFrom,
    dateTo,
    payableOnly: 'true',
    perPage: '100',
  })
}

globalThis.HouseAppAlertItems = {
  buildOrgAlertItems,
  buildAllOrgAlertItems,
  yesterdayEndIso,
  resolveUpcomingPeriod,
  buildUpcomingParams,
  DEFAULT_UPCOMING_PERIOD,
  parseTxAmount,
  parseMoneyReais,
  transactionRemainingReais,
  resolveTransactionListAmountReais,
  isTransactionPartiallyPaid,
  indexSplitPaidTotals,
  fetchSplitPaidTotals,
  computeDueTiming,
  isFutureScheduled,
  mapTransactionToItem,
}
