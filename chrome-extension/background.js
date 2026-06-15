importScripts('reminder-display.js')

const DEFAULT_POLL_MINUTES = 15
const ALARM_NAME = 'houseapp-poll'
const CONFIRM_NOTIFICATION_ID = 'houseapp-confirm-action'

// ── Bootstrap ────────────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(async () => {
  const { pollMinutes } = await chrome.storage.local.get('pollMinutes')
  createAlarm(pollMinutes || DEFAULT_POLL_MINUTES)
})

chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === ALARM_NAME) poll()
})

chrome.notifications.onButtonClicked.addListener(async (notificationId, buttonIndex) => {
  if (notificationId === CONFIRM_NOTIFICATION_ID) {
    if (buttonIndex === 1) {
      await clearPendingConfirmAction()
      chrome.notifications.clear(notificationId)
      return
    }
    if (buttonIndex === 0) {
      const action = await getPendingConfirmAction()
      await clearPendingConfirmAction()
      chrome.notifications.clear(notificationId)
      if (action) await executePendingConfirmAction(action)
    }
    return
  }

  const investmentMatch = notificationId.match(/^investment-(.+?)-(.+)$/)
  if (investmentMatch) {
    const [, orgSlug, alertId] = investmentMatch
    const alert = await findCachedAlert(alertId)
    const payload = alert?.payload || {}
    const title = payload.assetSymbol || payload.title || 'Aporte'
    await requestConfirmAction({
      type: 'ack-investment',
      orgSlug,
      alertId,
      title,
    })
    chrome.notifications.clear(notificationId)
    return
  }

  const overdueMatch = notificationId.match(/^overdue-(.+?)-(.+)$/)
  if (overdueMatch) {
    const [, orgSlug, transactionId] = overdueMatch
    const title = await getTransactionTitle(orgSlug, transactionId)
    await requestConfirmAction({
      type: 'pay-transaction',
      orgSlug,
      transactionId,
      title,
    })
    chrome.notifications.clear(notificationId)
    return
  }

  const reminderMatch = notificationId.match(/^reminder-(.+?)-(.+)$/)
  if (reminderMatch) {
    const [, orgSlug, alertId] = reminderMatch
    const alert = await findCachedAlert(alertId)
    const reminderId = alert?.payload?.reminderId || alert?.reminderId
    const title = alert?.payload?.title || 'Lembrete'

    if (buttonIndex === 0 && reminderId) {
      await requestConfirmAction({
        type: 'complete-reminder',
        orgSlug,
        reminderId,
        alertId,
        title,
      })
    } else if (buttonIndex === 1 && reminderId) {
      await snoozeReminder(orgSlug, reminderId, { days: 3 })
      await ackReminderAlert(orgSlug, alertId)
    }
    chrome.notifications.clear(notificationId)
    return
  }

  const ruleMatch = notificationId.match(/^rule-(.+?)-(.+)$/)
  if (ruleMatch) {
    const [, orgSlug, alertId] = ruleMatch
    const alert = await findCachedAlert(alertId)
    const title = alert?.payload?.title || 'Transação'

    if (alert?.occurrenceId) {
      await requestConfirmAction({
        type: 'pay-transaction',
        orgSlug,
        transactionId: alert.occurrenceId,
        title,
      })
    } else {
      await requestConfirmAction({
        type: 'ack-alert',
        orgSlug,
        alertId,
        title,
      })
    }
    chrome.notifications.clear(notificationId)
  }
})

// ── Alarm ────────────────────────────────────────────────────────────────────

function createAlarm(minutes) {
  chrome.alarms.clear(ALARM_NAME, () => {
    chrome.alarms.create(ALARM_NAME, { periodInMinutes: minutes })
  })
}

// ── Auth helpers ─────────────────────────────────────────────────────────────

async function getToken() {
  const { token, webUrl } = await chrome.storage.local.get(['token', 'webUrl'])
  if (token) return token

  if (webUrl) {
    try {
      const cookie = await chrome.cookies.get({ url: webUrl, name: 'houseapp' })
      if (cookie?.value) {
        await chrome.storage.local.set({ token: cookie.value })
        return cookie.value
      }
    } catch (_) {}
  }

  return null
}

async function refreshToken() {
  const { webUrl } = await chrome.storage.local.get('webUrl')
  if (!webUrl) return null

  try {
    const cookie = await chrome.cookies.get({ url: webUrl, name: 'houseapp' })
    if (cookie?.value) {
      await chrome.storage.local.set({ token: cookie.value })
      return cookie.value
    }
  } catch (_) {}
  return null
}

function authHeaders(token) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
}

// ── API calls ────────────────────────────────────────────────────────────────

async function fetchProfile(apiUrl, token) {
  const res = await fetch(`${apiUrl}/profile`, { headers: authHeaders(token) })
  if (!res.ok) throw new Error('unauthorized')
  return res.json()
}

async function fetchOrgs(apiUrl, token) {
  const res = await fetch(`${apiUrl}/orgs`, { headers: authHeaders(token) })
  if (!res.ok) throw new Error('orgs fetch failed')
  return res.json()
}

async function fetchReports(apiUrl, token, slug, year, month) {
  const res = await fetch(
    `${apiUrl}/org/${slug}/reports/transactions?year=${year}&month=${month}`,
    { headers: authHeaders(token) }
  )
  if (!res.ok) throw new Error('reports fetch failed')
  return res.json()
}

async function fetchPendingAlerts(apiUrl, token) {
  const res = await fetch(`${apiUrl}/me/alerts/pending`, { headers: authHeaders(token) })
  if (!res.ok) throw new Error('pending alerts fetch failed')
  return res.json()
}

async function fetchReminders(apiUrl, token, slug) {
  const res = await fetch(
    `${apiUrl}/org/${slug}/reminders?includeCompleted=true`,
    { headers: authHeaders(token) }
  )
  if (!res.ok) throw new Error('reminders fetch failed')
  return res.json()
}

async function ackReminderAlert(orgSlug, alertId) {
  const { apiUrl } = await chrome.storage.local.get('apiUrl')
  const token = await getToken()
  if (!apiUrl || !orgSlug || !token) return

  await fetch(`${apiUrl}/org/${orgSlug}/alerts/${alertId}/ack`, {
    method: 'POST',
    headers: authHeaders(token),
  })

  await chrome.storage.local.remove(['cachedPendingAlerts', 'cachedReportsByOrg', 'cachedRemindersByOrg'])
}

async function completeReminderPeriod(orgSlug, reminderId) {
  const { apiUrl } = await chrome.storage.local.get('apiUrl')
  const token = await getToken()
  if (!apiUrl || !orgSlug || !token || !reminderId) return

  await fetch(`${apiUrl}/org/${orgSlug}/reminders/${reminderId}/complete-period`, {
    method: 'POST',
    headers: authHeaders(token),
  })

  await chrome.storage.local.remove(['cachedPendingAlerts', 'cachedReportsByOrg', 'cachedRemindersByOrg'])
}

async function snoozeReminder(orgSlug, reminderId, body) {
  const { apiUrl } = await chrome.storage.local.get('apiUrl')
  const token = await getToken()
  if (!apiUrl || !orgSlug || !token || !reminderId) return

  await fetch(`${apiUrl}/org/${orgSlug}/reminders/${reminderId}/snooze`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(body),
  })

  await chrome.storage.local.remove(['cachedPendingAlerts', 'cachedReportsByOrg', 'cachedRemindersByOrg'])
}

async function payTransaction(orgSlug, transactionId) {
  const { apiUrl } = await chrome.storage.local.get('apiUrl')
  const token = await getToken()
  if (!apiUrl || !orgSlug || !token) return

  await fetch(`${apiUrl}/org/${orgSlug}/transaction/${transactionId}/pay`, {
    method: 'PATCH',
    headers: authHeaders(token),
  })

  await chrome.storage.local.remove(['cachedReportsByOrg', 'cachedRemindersByOrg'])
}

// ── Confirm actions (notification two-step) ───────────────────────────────────

async function findCachedAlert(alertId) {
  const { cachedPendingAlerts } = await chrome.storage.local.get('cachedPendingAlerts')
  return (cachedPendingAlerts?.alerts || []).find(a => a.id === alertId)
}

async function getTransactionTitle(orgSlug, transactionId) {
  const { cachedReportsByOrg } = await chrome.storage.local.get('cachedReportsByOrg')
  const reports = cachedReportsByOrg?.[orgSlug]
  if (!reports) return 'Transação'

  const all = [
    ...(reports.overdueTransactions?.transactions || []),
    ...(reports.upcomingAlerts?.transactions || []),
    ...(reports.allTransactions || []),
    ...(reports.paidThisMonth?.transactions || []),
  ]
  return all.find(t => t.id === transactionId)?.title || 'Transação'
}

function confirmMessageForAction(action) {
  switch (action.type) {
    case 'complete-reminder':
      return `Marcar "${action.title}" como feito neste mês?`
    case 'pay-transaction':
      return `Marcar "${action.title}" como paga?`
    case 'ack-investment':
    case 'ack-alert':
      return `Marcar "${action.title}" como feito?`
    default:
      return 'Confirmar esta ação?'
  }
}

async function getPendingConfirmAction() {
  const { pendingConfirmAction } = await chrome.storage.session.get('pendingConfirmAction')
  return pendingConfirmAction || null
}

async function clearPendingConfirmAction() {
  await chrome.storage.session.remove('pendingConfirmAction')
}

async function requestConfirmAction(action) {
  await chrome.storage.session.set({ pendingConfirmAction: action })
  chrome.notifications.create(CONFIRM_NOTIFICATION_ID, {
    type: 'basic',
    iconUrl: 'icons/icon48.png',
    title: 'Confirmar ação',
    message: confirmMessageForAction(action),
    buttons: [
      { title: 'Confirmar' },
      { title: 'Cancelar' },
    ],
    requireInteraction: true,
  })
}

async function executePendingConfirmAction(action) {
  switch (action.type) {
    case 'complete-reminder':
      await completeReminderPeriod(action.orgSlug, action.reminderId)
      if (action.alertId) await ackReminderAlert(action.orgSlug, action.alertId)
      break
    case 'pay-transaction':
      await payTransaction(action.orgSlug, action.transactionId)
      break
    case 'ack-investment':
    case 'ack-alert':
      await ackReminderAlert(action.orgSlug, action.alertId)
      break
  }
  poll()
}

// ── Badge ────────────────────────────────────────────────────────────────────

function todayMidnight() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function countOverdueTransactions(reports) {
  const today = todayMidnight()
  const overdue = (reports.overdueTransactions?.transactions || [])
    .filter(t => t.status === 'pending' || t.status === 'partial')
  const alsoOverdue = (reports.upcomingAlerts?.transactions || [])
    .filter(t => (t.status === 'pending' || t.status === 'partial') && new Date(t.dueDate) < today)
  const seenIds = new Set(overdue.map(t => t.id))
  return overdue.length + alsoOverdue.filter(t => !seenIds.has(t.id)).length
}

function isDueInMonth(dueDate, year, month) {
  const start = new Date(year, month - 1, 1)
  start.setHours(0, 0, 0, 0)
  const end = new Date(year, month, 0)
  end.setHours(23, 59, 59, 999)
  const due = new Date(dueDate)
  due.setHours(0, 0, 0, 0)
  return due >= start && due <= end
}

function countOverdueReminders(reminders, year, month) {
  return ReminderDisplay.countOverdueReminders(reminders, year, month)
}

function setBadge(overdueCount = 0) {
  if (overdueCount === 0) {
    chrome.action.setBadgeText({ text: '' })
    return
  }
  chrome.action.setBadgeText({ text: String(overdueCount) })
  chrome.action.setBadgeTextColor({ color: '#ffffff' })
  chrome.action.setBadgeBackgroundColor({ color: '#ef4444' })
}

// ── Notifications ────────────────────────────────────────────────────────────

function notifyReminder(alert) {
  const payload = alert.payload || {}
  const title = payload.title || 'Lembrete'
  const isOverdue = alert.kind === 'reminder_overdue' || payload.kind === 'overdue'
  const orgSuffix = alert.orgName ? ` [${alert.orgName}]` : ''
  const amount = payload.amountCents != null
    ? ` — R$ ${formatAmount(payload.amountCents / 100)}`
    : ''

  let detail = ''
  if (isOverdue) {
    const days = payload.overdueDays ?? 0
    detail = days === 1 ? '1 dia em atraso' : `${days} dias em atraso`
  } else {
    const daysUntilDue = payload.daysUntilDue ?? 0
    detail = daysUntilDue === 0 ? 'vence hoje' : daysUntilDue === 1 ? 'vence amanhã' : `vence em ${daysUntilDue} dias`
  }

  chrome.notifications.create(`reminder-${alert.orgSlug}-${alert.id}`, {
    type: 'basic',
    iconUrl: 'icons/icon48.png',
    title: `${isOverdue ? 'Lembrete vencido' : 'Lembrete'}${orgSuffix}`,
    message: `${title} — ${detail}${amount}`,
    buttons: [
      { title: 'Marcar como feito' },
      { title: 'Adiar 3 dias' },
    ],
    requireInteraction: false,
  })
}

function notifyRuleAlert(alert) {
  const payload = alert.payload || {}
  const title = payload.title || 'Transação'
  const orgSuffix = alert.orgName ? ` [${alert.orgName}]` : ''
  const amount = payload.amountCents != null
    ? ` — R$ ${formatAmount(payload.amountCents / 100)}`
    : ''
  const isOverdue = alert.kind === 'transaction_overdue' || payload.kind === 'overdue'
  let detail = ''

  if (isOverdue) {
    const days = payload.overdueDays ?? 0
    const dayLabel = days === 1 ? '1 dia' : `${days} dias`
    detail = `${dayLabel} em atraso`
  } else {
    const days = payload.daysUntilDue ?? 0
    detail = days === 0 ? 'vence hoje' : days === 1 ? 'vence amanhã' : `vence em ${days} dias`
  }

  const buttonTitle = alert.occurrenceId ? 'Marcar como paga' : 'Marcar como feito'

  chrome.notifications.create(`rule-${alert.orgSlug}-${alert.id}`, {
    type: 'basic',
    iconUrl: 'icons/icon48.png',
    title: `${isOverdue ? 'Transação vencida' : 'Vence em breve'}${orgSuffix}`,
    message: `${title} — ${detail}${amount}`,
    buttons: [{ title: buttonTitle }],
    requireInteraction: false,
  })
}

function notifyInvestmentAlert(alert) {
  const payload = alert.payload || {}
  const amountLabel = payload.plannedAmount
    ? `R$ ${formatAmount(payload.plannedAmount)}`
    : `${payload.plannedQuantity} unidade(s)`
  const isOverdue = alert.kind === 'investment_overdue' || payload.status === 'overdue'
  const orgSuffix = alert.orgName ? ` [${alert.orgName}]` : ''

  chrome.notifications.create(`investment-${alert.orgSlug}-${alert.id}`, {
    type: 'basic',
    iconUrl: 'icons/icon48.png',
    title: `${isOverdue ? 'Aporte em atraso' : 'Aporte do mês pendente'}${orgSuffix}`,
    message: `${payload.assetSymbol || payload.title} — ${amountLabel}`,
    buttons: [{ title: 'Marcar como feito' }],
    requireInteraction: false,
  })
}

function formatAmount(amount) {
  const num = typeof amount === 'number' ? amount : parseFloat(amount)
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
}

// ── Poll ──────────────────────────────────────────────────────────────────────

async function poll() {
  try {
    const token = await getToken()
      if (!token) { setBadge(0); return }

    const { apiUrl } = await chrome.storage.local.get('apiUrl')
    if (!apiUrl) { setBadge(0); return }

    // Validate token
    try {
      await fetchProfile(apiUrl, token)
    } catch (_) {
      // Token expired, try reading fresh cookie from web app
      const newToken = await refreshToken()
      if (newToken) {
        try {
          await fetchProfile(apiUrl, newToken)
        } catch (_) {
          await chrome.storage.local.remove('token')
          setBadge(0)
          return
        }
      } else {
        await chrome.storage.local.remove('token')
        setBadge(0)
        return
      }
    }

    // Fetch all orgs
    const orgsData = await fetchOrgs(apiUrl, token)
    const orgs = orgsData.organizations || orgsData.orgs || orgsData
    if (!orgs?.length) { setBadge(0); return }

    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1

    // Load previous cache to detect new items
    const {
      cachedPendingAlerts: prevPendingAlerts,
    } = await chrome.storage.local.get([
      'cachedPendingAlerts',
    ])
    const prevPendingAlertIds = new Set((prevPendingAlerts?.alerts || []).map(a => a.id))

    // Fetch reports for all orgs in parallel
    const results = await Promise.all(
      orgs.map(org =>
        fetchReports(apiUrl, token, org.slug, year, month)
          .then(data => ({ slug: org.slug, name: org.name, reports: data.reports || data }))
          .catch(() => null)
      )
    )

    let totalOverdue = 0
    const newCache = {}
    const remindersCache = {}

    for (const orgData of results.filter(Boolean)) {
      totalOverdue += countOverdueTransactions(orgData.reports)
      newCache[orgData.slug] = orgData.reports
    }

    const reminderResults = await Promise.all(
      orgs.map(org =>
        fetchReminders(apiUrl, token, org.slug)
          .then(data => ({ slug: org.slug, reminders: data.reminders || data }))
          .catch(() => null)
      )
    )
    for (const orgReminders of reminderResults.filter(Boolean)) {
      remindersCache[orgReminders.slug] = orgReminders.reminders
      totalOverdue += countOverdueReminders(orgReminders.reminders, year, month)
    }

    let pendingAlerts = null
    try {
      pendingAlerts = await fetchPendingAlerts(apiUrl, token)
      const alerts = pendingAlerts.alerts || []

      for (const alert of alerts) {
        if (!prevPendingAlertIds.has(alert.id)) {
          if (alert.sourceType === 'rule') notifyRuleAlert(alert)
          else if (alert.sourceType === 'investment') notifyInvestmentAlert(alert)
          else notifyReminder(alert)
        }
      }
    } catch (_) {}

    setBadge(totalOverdue)

    await chrome.storage.local.set({
      cachedReportsByOrg: newCache,
      cachedRemindersByOrg: remindersCache,
      cachedPendingAlerts: pendingAlerts || null,
      badgeTotals: {
        overdue: totalOverdue,
      },
      cachedYear: year,
      cachedMonth: month,
    })

    chrome.runtime.sendMessage({ type: 'data-updated' }).catch(() => {})
  } catch (err) {
    console.error('[HouseApp] poll error:', err)
  }
}

// Run once on startup
poll()
