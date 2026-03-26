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
  const match = notificationId.match(/^overdue-(.+?)-(.+)$/)
  if (!match) return
  const [, orgSlug, transactionId] = match
  await payTransaction(orgSlug, transactionId)
  chrome.notifications.clear(notificationId)
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

async function fetchInvestmentReminders(apiUrl, token) {
  const res = await fetch(`${apiUrl}/me/investments/reminders`, { headers: authHeaders(token) })
  if (!res.ok) throw new Error('investment reminders fetch failed')
  return res.json()
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

function setBadge(overdueCount, upcomingCount, investmentCount = 0) {
  const total = overdueCount + upcomingCount + investmentCount
  if (total === 0) {
    chrome.action.setBadgeText({ text: '' })
    return
  }
  chrome.action.setBadgeText({ text: String(total) })
  chrome.action.setBadgeTextColor({ color: '#ffffff' })
  chrome.action.setBadgeBackgroundColor({
    color: overdueCount > 0 ? '#ef4444' : investmentCount > 0 ? '#2563eb' : '#f59e0b',
  })
}

// ── Notifications ────────────────────────────────────────────────────────────

function notifyOverdue(tx, orgName) {
  const days = tx.overdueDays || 0
  const dayLabel = days === 1 ? '1 dia' : `${days} dias`
  const orgSuffix = orgName ? ` [${orgName}]` : ''
  chrome.notifications.create(`overdue-${tx.orgSlug}-${tx.id}`, {
    type: 'basic',
    iconUrl: 'icons/icon48.png',
    title: `Transação vencida${orgSuffix}`,
    message: `${tx.title} — R$ ${formatAmount(tx.amount)} (${dayLabel} em atraso)`,
    buttons: [{ title: 'Marcar como paga' }],
    requireInteraction: false,
  })
}

function notifyUpcoming(tx, orgName) {
  const days = tx.daysUntilDue
  const dueLabel = days === 0 ? 'hoje' : days === 1 ? 'amanhã' : `em ${days} dias`
  const orgSuffix = orgName ? ` [${orgName}]` : ''
  chrome.notifications.create(`upcoming-${tx.orgSlug}-${tx.id}`, {
    type: 'basic',
    iconUrl: 'icons/icon48.png',
    title: `Vence em breve${orgSuffix}`,
    message: `${tx.title} — vence ${dueLabel} (R$ ${formatAmount(tx.amount)})`,
    requireInteraction: false,
  })
}

function notifyInvestment(reminder) {
  const amountLabel = reminder.plannedAmount
    ? `R$ ${formatAmount(reminder.plannedAmount)}`
    : `${reminder.plannedQuantity} unidade(s)`

  chrome.notifications.create(`investment-${reminder.planId}-${reminder.referenceMonth}`, {
    type: 'basic',
    iconUrl: 'icons/icon48.png',
    title: reminder.status === 'overdue' ? 'Aporte em atraso' : 'Aporte do mês pendente',
    message: `${reminder.assetSymbol} — ${amountLabel}`,
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
      if (!token) { setBadge(0, 0, 0); return }

    const { apiUrl } = await chrome.storage.local.get('apiUrl')
    if (!apiUrl) { setBadge(0, 0, 0); return }

    // Validate token
    try {
      await fetchProfile(apiUrl, token)
    } catch (_) {
      await chrome.storage.local.remove('token')
      setBadge(0, 0, 0)
      return
    }

    // Fetch all orgs
    const orgsData = await fetchOrgs(apiUrl, token)
    const orgs = orgsData.organizations || orgsData.orgs || orgsData
    if (!orgs?.length) { setBadge(0, 0, 0); return }

    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1

    // Load previous cache to detect new items
    const { cachedReportsByOrg: prevCache, cachedInvestmentReminders: prevInvestmentReminders } =
      await chrome.storage.local.get(['cachedReportsByOrg', 'cachedInvestmentReminders'])
    const prevOverdueIds = new Set()
    const prevUpcomingIds = new Set()
    const prevInvestmentIds = new Set((prevInvestmentReminders?.items || []).map(item => `${item.planId}-${item.referenceMonth}`))
    for (const reports of Object.values(prevCache || {})) {
      for (const t of reports.overdueTransactions?.transactions || []) prevOverdueIds.add(t.id)
      for (const t of reports.upcomingAlerts?.transactions    || []) prevUpcomingIds.add(t.id)
    }

    // Fetch reports for all orgs in parallel
    const results = await Promise.all(
      orgs.map(org =>
        fetchReports(apiUrl, token, org.slug, year, month)
          .then(data => ({ slug: org.slug, name: org.name, reports: data.reports || data }))
          .catch(() => null)
      )
    )

    let totalOverdue = 0
    let totalUpcoming = 0
    let totalInvestments = 0
    const newCache = {}

    for (const orgData of results.filter(Boolean)) {
      const overdue  = (orgData.reports.overdueTransactions?.transactions || [])
        .map(tx => ({ ...tx, orgSlug: orgData.slug }))
      const upcoming = (orgData.reports.upcomingAlerts?.transactions || [])
        .map(tx => ({ ...tx, orgSlug: orgData.slug }))

      for (const tx of overdue)  { if (!prevOverdueIds.has(tx.id))  notifyOverdue(tx,  orgData.name) }
      for (const tx of upcoming) { if (!prevUpcomingIds.has(tx.id)) notifyUpcoming(tx, orgData.name) }

      totalOverdue  += overdue.filter(t => t.status === 'pending').length
      totalUpcoming += upcoming.filter(t => t.status === 'pending').length

      newCache[orgData.slug] = orgData.reports
    }

    let investmentReminders = null
    try {
      investmentReminders = await fetchInvestmentReminders(apiUrl, token)
      const reminders = investmentReminders.reminders || investmentReminders
      totalInvestments = reminders.summary?.total || reminders.items?.length || 0

      for (const item of reminders.items || []) {
        const key = `${item.planId}-${item.referenceMonth}`
        if (!prevInvestmentIds.has(key)) notifyInvestment(item)
      }
    } catch (_) {
      totalInvestments = 0
    }

    setBadge(totalOverdue, totalUpcoming, totalInvestments)

    await chrome.storage.local.set({
      cachedReportsByOrg: newCache,
      cachedInvestmentReminders: investmentReminders?.reminders || investmentReminders || null,
      badgeTotals: { overdue: totalOverdue, upcoming: totalUpcoming, investments: totalInvestments },
      cachedYear: year,
      cachedMonth: month,
    })
  } catch (err) {
    console.error('[HouseApp] poll error:', err)
  }
}

// Run once on startup
poll()
