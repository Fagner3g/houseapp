importScripts('lib/notification-utils.js', 'lib/alert-items.js', 'lib/pay-utils.js')

const DEFAULT_POLL_MINUTES = 15
const ALARM_NAME = 'houseapp-poll'
const CONFIRM_NOTIFICATION_ID = 'houseapp-confirm-action'
const notify = globalThis.HouseAppNotify
const alertItems = globalThis.HouseAppAlertItems
const payUtil = globalThis.HouseAppPay

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
    const cached = await getCachedNotification(transactionId)
    await requestConfirmAction({
      type: 'pay-transaction',
      orgSlug,
      transactionId,
      title: cached?.title || 'Transação',
      notificationId: cached?.id || null,
      paidAmountReais: cached?.amountReais || null,
    })
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

async function fetchPendingNotifications(apiUrl, token) {
  const res = await fetch(`${apiUrl}/notifications/pending`, { headers: authHeaders(token) })
  if (!res.ok) throw new Error('pending notifications fetch failed')
  return res.json()
}

async function fetchOrgAlerts(apiUrl, token, org, upcomingPeriod) {
  const dateTo = alertItems.yesterdayEndIso()
  const overdueParams = new URLSearchParams({
    status: 'pending',
    dateTo,
    payableOnly: 'true',
    perPage: '100',
  })
  const upcomingParams = alertItems.buildUpcomingParams(upcomingPeriod)
  const scheduledParams = new URLSearchParams({
    status: 'pending',
    payableOnly: 'true',
    scheduledOnly: 'true',
    perPage: '100',
  })
  const headers = authHeaders(token)
  const [overdueRes, upcomingRes, scheduledRes] = await Promise.all([
    fetch(`${apiUrl}/organizations/${org.slug}/transactions?${overdueParams}`, { headers }),
    fetch(`${apiUrl}/organizations/${org.slug}/transactions?${upcomingParams}`, { headers }),
    fetch(`${apiUrl}/organizations/${org.slug}/transactions?${scheduledParams}`, { headers }),
  ])
  if (!overdueRes.ok || !upcomingRes.ok) {
    return { orgId: org.id, overdueTransactions: [], upcomingTransactions: [], scheduledTransactions: [] }
  }
  const overdue = await overdueRes.json()
  const upcoming = await upcomingRes.json()
  const scheduled = scheduledRes.ok ? await scheduledRes.json() : { transactions: [] }
  const allTransactions = [
    ...(overdue.transactions || []),
    ...(upcoming.transactions || []),
    ...(scheduled.transactions || []),
  ]
  const transactionIds = [...new Set(allTransactions.map(tx => tx.id))]
  const splitPaidById = await alertItems.fetchSplitPaidTotals(
    apiUrl,
    token,
    org.slug,
    transactionIds
  )
  return {
    orgId: org.id,
    overdueTransactions: overdue.transactions || [],
    upcomingTransactions: upcoming.transactions || [],
    scheduledTransactions: scheduled.transactions || [],
    splitPaidById,
  }
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
  if (!notify.EXTENSION_CHANNELS.has(notification.channel)) return
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

async function getCachedNotification(transactionId) {
  const { cachedPendingNotifications } = await chrome.storage.local.get('cachedPendingNotifications')
  const found = (cachedPendingNotifications?.notifications || []).find(
    n => n.transactionId === transactionId
  )
  if (!found) return null
  const amountInfo = notify.parseNotificationAmount(found.metadata || {})
  return { id: found.id, title: found.title, amountReais: amountInfo.hasAmount ? amountInfo.reais : null }
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
    const { apiUrl } = await chrome.storage.local.get('apiUrl')
    const token = await getToken()
    if (apiUrl && token) {
      await payUtil.payTransaction(
        apiUrl,
        token,
        action.orgSlug,
        action.transactionId,
        action.paidAmountReais,
        new Date().toISOString()
      )
      if (action.notificationId) {
        await payUtil.dismissNotification(apiUrl, token, action.notificationId)
      }
    }
    await chrome.storage.local.remove(['cachedPendingNotifications'])
  }
  poll()
}

async function poll() {
  try {
    const token = await getToken()
    if (!token) { setBadge(0); return }

    const { apiUrl, upcomingPeriod } = await chrome.storage.local.get(['apiUrl', 'upcomingPeriod'])
    if (!apiUrl) { setBadge(0); return }

    try {
      await fetchProfile(apiUrl, token)
    } catch (_) {
      await chrome.storage.local.remove('token')
      setBadge(0)
      return
    }

    const orgsData = await fetchOrgs(apiUrl, token)
    const orgs = orgsData.organizations || orgsData.orgs || orgsData
    if (!orgs?.length) { setBadge(0); return }

    const { cachedPendingNotifications: prevPending } = await chrome.storage.local.get(
      'cachedPendingNotifications'
    )
    const prevIds = new Set((prevPending?.notifications || []).map(n => n.id))

    let pending = null
    let totalOverdue = 0
    try {
      pending = await fetchPendingNotifications(apiUrl, token)
      const notifications = pending.notifications || []
      const orgDataList = await Promise.all(
        orgs.map(org => fetchOrgAlerts(apiUrl, token, org, upcomingPeriod))
      )
      const allItems = alertItems.buildAllOrgAlertItems({ orgDataList, notifications, orgs })
      totalOverdue = notify.countByKind(allItems).overdue

      for (const notification of notifications) {
        if (!prevIds.has(notification.id) && notification.transactionId) {
          if (!notify.EXTENSION_CHANNELS.has(notification.channel)) continue
          const org = orgs.find(o => o.id === notification.organizationId)
          notifyPendingItem(notification, org?.slug, org?.name)
        }
      }
    } catch (_) {}

    setBadge(totalOverdue)

    await chrome.storage.local.set({
      cachedPendingNotifications: pending,
      badgeTotals: { overdue: totalOverdue },
      lastPollAt: new Date().toISOString(),
    })

    chrome.runtime.sendMessage({ type: 'data-updated' }).catch(() => {})
  } catch (err) {
    console.error('[HouseApp] poll error:', err)
  }
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'poll-now') {
    poll().then(() => sendResponse({ ok: true })).catch(() => sendResponse({ ok: false }))
    return true
  }
})

poll()
