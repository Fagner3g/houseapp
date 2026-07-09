const DEFAULT_POLL_MINUTES = 15
const ALARM_NAME = 'houseapp-poll'
const CONFIRM_NOTIFICATION_ID = 'houseapp-confirm-action'

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

  const payMatch = notificationId.match(/^notify-(.+?)-(.+)$/)
  if (payMatch && buttonIndex === 0) {
    const [, orgSlug, transactionId] = payMatch
    const title = await getNotificationTitle(transactionId)
    await requestConfirmAction({ type: 'pay-transaction', orgSlug, transactionId, title })
    chrome.notifications.clear(notificationId)
  }
})

function createAlarm(minutes) {
  chrome.alarms.clear(ALARM_NAME, () => {
    chrome.alarms.create(ALARM_NAME, { periodInMinutes: minutes })
  })
}

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

async function fetchProfile(apiUrl, token) {
  const res = await fetch(`${apiUrl}/profile`, { headers: authHeaders(token) })
  if (!res.ok) throw new Error('unauthorized')
}

async function fetchOrgs(apiUrl, token) {
  const res = await fetch(`${apiUrl}/orgs`, { headers: authHeaders(token) })
  if (!res.ok) throw new Error('orgs fetch failed')
  return res.json()
}

async function fetchSummary(apiUrl, token, slug) {
  const res = await fetch(`${apiUrl}/organizations/${slug}/reports/summary`, {
    headers: authHeaders(token),
  })
  if (!res.ok) throw new Error('summary fetch failed')
  return res.json()
}

async function fetchPendingNotifications(apiUrl, token) {
  const res = await fetch(`${apiUrl}/notifications/pending`, { headers: authHeaders(token) })
  if (!res.ok) throw new Error('pending notifications fetch failed')
  return res.json()
}

async function payTransaction(orgSlug, transactionId) {
  const { apiUrl } = await chrome.storage.local.get('apiUrl')
  const token = await getToken()
  if (!apiUrl || !orgSlug || !token) return

  await fetch(`${apiUrl}/organizations/${orgSlug}/transactions/${transactionId}/pay`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify({ paidAt: new Date().toISOString() }),
  })

  await chrome.storage.local.remove(['cachedPendingNotifications', 'cachedSummaryByOrg'])
}

async function markNotificationRead(notificationId) {
  const { apiUrl } = await chrome.storage.local.get('apiUrl')
  const token = await getToken()
  if (!apiUrl || !token) return

  await fetch(`${apiUrl}/notifications/${notificationId}/read`, {
    method: 'PATCH',
    headers: authHeaders(token),
  })
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

function notifyPendingItem(notification, orgSlug, orgName) {
  const orgSuffix = orgName ? ` [${orgName}]` : ''
  const txId = notification.transactionId
  if (!txId || !orgSlug) return

  chrome.notifications.create(`notify-${orgSlug}-${txId}`, {
    type: 'basic',
    iconUrl: 'icons/icon48.png',
    title: `${notification.title}${orgSuffix}`,
    message: notification.body || 'Transação pendente',
    buttons: [{ title: 'Marcar como paga' }],
    requireInteraction: false,
  })
}

async function getNotificationTitle(transactionId) {
  const { cachedPendingNotifications } = await chrome.storage.local.get('cachedPendingNotifications')
  const found = (cachedPendingNotifications?.notifications || []).find(
    n => n.transactionId === transactionId
  )
  return found?.title || 'Transação'
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
    message: `Marcar "${action.title}" como paga?`,
    buttons: [{ title: 'Confirmar' }, { title: 'Cancelar' }],
    requireInteraction: true,
  })
}

async function executePendingConfirmAction(action) {
  if (action.type === 'pay-transaction') {
    await payTransaction(action.orgSlug, action.transactionId)
    if (action.notificationId) await markNotificationRead(action.notificationId)
  }
  poll()
}

async function poll() {
  try {
    const token = await getToken()
    if (!token) {
      setBadge(0)
      return
    }

    const { apiUrl } = await chrome.storage.local.get('apiUrl')
    if (!apiUrl) {
      setBadge(0)
      return
    }

    try {
      await fetchProfile(apiUrl, token)
    } catch (_) {
      await chrome.storage.local.remove('token')
      setBadge(0)
      return
    }

    const orgsData = await fetchOrgs(apiUrl, token)
    const orgs = orgsData.organizations || orgsData.orgs || orgsData
    if (!orgs?.length) {
      setBadge(0)
      return
    }

    const { cachedPendingNotifications: prevPending } = await chrome.storage.local.get(
      'cachedPendingNotifications'
    )
    const prevIds = new Set((prevPending?.notifications || []).map(n => n.id))

    let totalOverdue = 0
    const summaryCache = {}

    const summaries = await Promise.all(
      orgs.map(org =>
        fetchSummary(apiUrl, token, org.slug)
          .then(data => ({ slug: org.slug, name: org.name, summary: data }))
          .catch(() => null)
      )
    )

    for (const item of summaries.filter(Boolean)) {
      totalOverdue += item.summary?.overdueCount ?? 0
      summaryCache[item.slug] = item.summary
    }

    let pending = null
    try {
      pending = await fetchPendingNotifications(apiUrl, token)
      const notifications = pending.notifications || []

      for (const notification of notifications) {
        if (!prevIds.has(notification.id) && notification.transactionId) {
          const org = orgs.find(o => o.id === notification.organizationId)
          notifyPendingItem(notification, org?.slug, org?.name)
        }
      }
    } catch (_) {}

    setBadge(totalOverdue)

    await chrome.storage.local.set({
      cachedSummaryByOrg: summaryCache,
      cachedPendingNotifications: pending,
      badgeTotals: { overdue: totalOverdue },
    })

    chrome.runtime.sendMessage({ type: 'data-updated' }).catch(() => {})
  } catch (err) {
    console.error('[HouseApp] poll error:', err)
  }
}

poll()
