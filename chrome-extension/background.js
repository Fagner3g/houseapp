const DEFAULT_POLL_MINUTES = 15
const ALARM_NAME = 'houseapp-poll'

// ── Bootstrap ────────────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(async () => {
  const { pollMinutes } = await chrome.storage.local.get('pollMinutes')
  createAlarm(pollMinutes || DEFAULT_POLL_MINUTES)
})

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) poll()
})

chrome.notifications.onButtonClicked.addListener(async (notificationId, buttonIndex) => {
  if (buttonIndex !== 0) return
  const match = notificationId.match(/^overdue-(.+)$/)
  if (!match) return
  const transactionId = match[1]
  await payTransaction(transactionId)
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
    } catch (_) {
      // cookies API may fail if host_permissions not matched
    }
  }

  return null
}

async function getConfig() {
  return chrome.storage.local.get(['apiUrl', 'webUrl', 'orgSlug'])
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

async function payTransaction(transactionId) {
  const { apiUrl, orgSlug } = await getConfig()
  const token = await getToken()
  if (!apiUrl || !orgSlug || !token) return

  await fetch(`${apiUrl}/org/${orgSlug}/transaction/${transactionId}/pay`, {
    method: 'PATCH',
    headers: authHeaders(token),
  })

  // Invalidate cache so popup refreshes
  await chrome.storage.local.remove('cachedReport')
}

// ── Badge ────────────────────────────────────────────────────────────────────

function setBadge(count) {
  if (count > 0) {
    chrome.action.setBadgeText({ text: String(count) })
    chrome.action.setBadgeBackgroundColor({ color: '#ef4444' })
  } else {
    chrome.action.setBadgeText({ text: '' })
  }
}

// ── Notifications ────────────────────────────────────────────────────────────

function notifyOverdue(tx) {
  const days = tx.overdueDays || 0
  const dayLabel = days === 1 ? '1 dia' : `${days} dias`
  chrome.notifications.create(`overdue-${tx.id}`, {
    type: 'basic',
    iconUrl: 'icons/icon48.png',
    title: 'Transação vencida',
    message: `${tx.title} — R$ ${formatAmount(tx.amount)} (${dayLabel} em atraso)`,
    buttons: [{ title: 'Marcar como paga' }],
    requireInteraction: false,
  })
}

function notifyUpcoming(tx) {
  const days = tx.daysUntilDue
  const dueLabel = days === 0 ? 'hoje' : days === 1 ? 'amanhã' : `em ${days} dias`
  chrome.notifications.create(`upcoming-${tx.id}`, {
    type: 'basic',
    iconUrl: 'icons/icon48.png',
    title: 'Vence em breve',
    message: `${tx.title} — vence ${dueLabel} (R$ ${formatAmount(tx.amount)})`,
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

    const { apiUrl } = await getConfig()
    if (!apiUrl) { setBadge(0); return }

    // Validate token
    try { await fetchProfile(apiUrl, token) } catch (_) {
      await chrome.storage.local.remove('token')
      setBadge(0)
      return
    }

    // Resolve org slug
    let { orgSlug } = await getConfig()
    if (!orgSlug) {
      const orgsData = await fetchOrgs(apiUrl, token)
      const orgs = orgsData.orgs || orgsData
      if (!orgs?.length) { setBadge(0); return }
      orgSlug = orgs[0].slug
      await chrome.storage.local.set({ orgSlug })
    }

    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1

    const data = await fetchReports(apiUrl, token, orgSlug, year, month)
    const reports = data.reports || data

    const { cachedReport } = await chrome.storage.local.get('cachedReport')
    const prevOverdueIds = new Set((cachedReport?.overdueTransactions?.transactions || []).map(t => t.id))
    const prevUpcomingIds = new Set((cachedReport?.upcomingAlerts?.transactions || []).map(t => t.id))

    const overdue = reports.overdueTransactions?.transactions || []
    const upcoming = reports.upcomingAlerts?.transactions || []

    // Fire notifications for new items only
    for (const tx of overdue) {
      if (!prevOverdueIds.has(tx.id)) notifyOverdue(tx)
    }
    for (const tx of upcoming) {
      if (!prevUpcomingIds.has(tx.id)) notifyUpcoming(tx)
    }

    setBadge(overdue.length)
    await chrome.storage.local.set({
      cachedReport: reports,
      cachedYear: year,
      cachedMonth: month,
    })
  } catch (err) {
    console.error('[HouseApp] poll error:', err)
  }
}

// Run once on startup
poll()
