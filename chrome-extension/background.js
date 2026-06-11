const DEFAULT_POLL_MINUTES = 15
const ALARM_NAME = 'houseapp-poll'

// ── Bootstrap ────────────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(async () => {
  const { pollMinutes } = await chrome.storage.local.get('pollMinutes')
  createAlarm(pollMinutes || DEFAULT_POLL_MINUTES)
})

chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === ALARM_NAME) poll()
})

chrome.notifications.onButtonClicked.addListener(async (notificationId, buttonIndex) => {
  if (buttonIndex !== 0) return

  const investmentMatch = notificationId.match(/^investment-(.+?)-(.+)$/)
  if (investmentMatch) {
    const [, orgSlug, alertId] = investmentMatch
    await ackReminderAlert(orgSlug, alertId)
    chrome.notifications.clear(notificationId)
    return
  }

  const overdueMatch = notificationId.match(/^overdue-(.+?)-(.+)$/)
  if (overdueMatch) {
    const [, orgSlug, transactionId] = overdueMatch
    await payTransaction(orgSlug, transactionId)
    chrome.notifications.clear(notificationId)
    return
  }

  const reminderMatch = notificationId.match(/^reminder-(.+?)-(.+)$/)
  if (reminderMatch) {
    const [, orgSlug, alertId] = reminderMatch
    await ackReminderAlert(orgSlug, alertId)
    chrome.notifications.clear(notificationId)
    return
  }

  const ruleMatch = notificationId.match(/^rule-(.+?)-(.+)$/)
  if (ruleMatch) {
    const [, orgSlug, alertId] = ruleMatch
    const { cachedPendingAlerts } = await chrome.storage.local.get('cachedPendingAlerts')
    const alert = (cachedPendingAlerts?.alerts || []).find(a => a.id === alertId)
    if (alert?.occurrenceId) {
      await payTransaction(orgSlug, alert.occurrenceId)
    } else {
      await ackReminderAlert(orgSlug, alertId)
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
  const res = await fetch(`${apiUrl}/org/${slug}/reminders`, { headers: authHeaders(token) })
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

  await chrome.storage.local.remove(['cachedPendingAlerts', 'cachedReportsByOrg'])
}

async function payTransaction(orgSlug, transactionId) {
  const { apiUrl } = await chrome.storage.local.get('apiUrl')
  const token = await getToken()
  if (!apiUrl || !orgSlug || !token) return

  await fetch(`${apiUrl}/org/${orgSlug}/transaction/${transactionId}/pay`, {
    method: 'PATCH',
    headers: authHeaders(token),
  })

  await chrome.storage.local.remove('cachedReportsByOrg')
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

function countOverdueReminders(reminders) {
  const today = todayMidnight()
  return (reminders || []).filter(r => {
    if (r.completedAt) return false
    const due = new Date(r.dueDate)
    due.setHours(0, 0, 0, 0)
    return due < today
  }).length
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
  const daysUntilDue = payload.daysUntilDue ?? 0
  const dueLabel = daysUntilDue === 0 ? 'hoje' : daysUntilDue === 1 ? 'amanhã' : `em ${daysUntilDue} dias`
  const orgSuffix = alert.orgName ? ` [${alert.orgName}]` : ''
  const amount = payload.amountCents != null
    ? ` — R$ ${formatAmount(payload.amountCents / 100)}`
    : ''

  chrome.notifications.create(`reminder-${alert.orgSlug}-${alert.id}`, {
    type: 'basic',
    iconUrl: 'icons/icon48.png',
    title: `Lembrete${orgSuffix}`,
    message: `${title} — vence ${dueLabel}${amount}`,
    buttons: [{ title: 'Marcar como feito' }],
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

    for (const orgData of results.filter(Boolean)) {
      totalOverdue += countOverdueTransactions(orgData.reports)
      newCache[orgData.slug] = orgData.reports
    }

    const reminderResults = await Promise.all(
      orgs.map(org =>
        fetchReminders(apiUrl, token, org.slug)
          .then(data => data.reminders || data)
          .catch(() => [])
      )
    )
    for (const reminders of reminderResults) {
      totalOverdue += countOverdueReminders(reminders)
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
      cachedPendingAlerts: pendingAlerts || null,
      badgeTotals: {
        overdue: totalOverdue,
      },
      cachedYear: year,
      cachedMonth: month,
    })
  } catch (err) {
    console.error('[HouseApp] poll error:', err)
  }
}

// Run once on startup
poll()
